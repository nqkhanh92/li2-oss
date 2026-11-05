import 'server-only'
import { redis } from '@/infrastructure/cache/redis'
import { logger } from '@/infrastructure/logging/logger'
import { QUEUE_NAMES, type QueueName } from './constants'
import { randomUUID } from 'crypto'
import protobuf from 'protobufjs'

const log = logger.child({
  module: 'AsynqClient',
})

// Define the protobuf schema (matches internal/proto/asynq.proto)
const TaskMessageProto = `
syntax = "proto3";
package asynq;

message TaskMessage {
  string type = 1;
  bytes payload = 2;
  string id = 3;
  string queue = 4;
  int32 retry = 5;
  int32 retried = 6;
  string error_msg = 7;
  int64 timeout = 8;
  int64 deadline = 9;
  string unique_key = 10;
  int64 last_failed_at = 11;
  int64 retention = 12;
  int64 completed_at = 13;
  string group_key = 14;
  map<string, string> headers = 15;
}
`

// Parse the protobuf schema
let TaskMessage: protobuf.Type
try {
  const root = protobuf.parse(TaskMessageProto).root
  TaskMessage = root.lookupType('asynq.TaskMessage')
} catch (error) {
  log.error({ error }, 'Failed to parse protobuf schema')
  throw error
}

/**
 * Encodes a task message using Protocol Buffers
 */
function encodeTaskMessage(msg: {
  type: string
  payload: Buffer
  id: string
  queue: string
  retry: number
  retried: number
  error_msg: string
  timeout: number
  deadline: number
  unique_key: string
  group_key: string
  retention: number
  completed_at: number
  last_failed_at: number
  headers?: Record<string, string>
}): Buffer {
  const errMsg = TaskMessage.verify(msg)
  if (errMsg) {
    throw new Error(`Invalid task message: ${errMsg}`)
  }

  const message = TaskMessage.create(msg)
  const buffer = TaskMessage.encode(message).finish()
  return Buffer.from(buffer)
}

/**
 * Enqueues a task to Asynq via Redis
 *
 * @param taskType - Task type constant (e.g., TASK_AUDIT_LOG_CREATE)
 * @param payload - Task payload object (will be JSON-encoded)
 * @param options - Task options (queue, retry, timeout)
 */
export async function enqueueTask(
  taskType: string,
  payload: unknown,
  options: {
    queue?: QueueName
    maxRetry?: number
    timeout?: number // in seconds
    taskId?: string
    retention?: number // in seconds
    headers?: Record<string, string>
  } = {}
): Promise<string | null> {
  const {
    queue = QUEUE_NAMES.DEFAULT,
    maxRetry = 3, // Asynq default
    timeout = 30, // 30 in seconds
    taskId = randomUUID(),
    retention = 0, // 1 hour default
    headers = {},
  } = options

  try {
    // Encode the task message using protobuf
    const encoded = encodeTaskMessage({
      type: taskType,
      payload: Buffer.from(JSON.stringify(payload)),
      id: taskId,
      queue: queue,
      retry: maxRetry,
      retried: 0,
      error_msg: '',
      timeout: timeout,
      deadline: 0, // 0 means no deadline
      unique_key: '',
      group_key: '',
      retention: retention,
      completed_at: 0,
      last_failed_at: 0,
      headers: headers,
    })

    const nowNano = Date.now() * 1000000 // Convert to nanoseconds

    // Asynq uses these Redis keys:
    const taskKey = `asynq:{${queue}}:t:${taskId}`
    const pendingKey = `asynq:{${queue}}:pending`
    const allQueuesKey = 'asynq:queues'

    // Use Lua script to ensure atomicity (matches Asynq's enqueueCmd)
    const script = `
      if redis.call("EXISTS", KEYS[1]) == 1 then
        return 0
      end
      redis.call("HSET", KEYS[1],
                 "msg", ARGV[1],
                 "state", "pending",
                 "pending_since", ARGV[3])
      redis.call("LPUSH", KEYS[2], ARGV[2])
      return 1
    `

    // First, register the queue
    await redis.sadd(allQueuesKey, queue)

    // Then enqueue the task using Lua script
    const result = (await redis.eval(
      script,
      2, // number of keys
      taskKey,
      pendingKey,
      encoded,
      taskId,
      nowNano.toString()
    )) as number

    if (result === 0) {
      log.warn({ taskType, taskId, queue }, 'Task ID already exists, skipping enqueue')
      return null
    }

    log.debug({ taskType, taskId, queue }, 'Task enqueued successfully')

    return taskId
  } catch (error) {
    log.error({ error, taskType, payload, options }, 'Failed to enqueue task to Asynq')
    return null
  }
}

/**
 * Health check for queue infrastructure
 */
export async function isQueueHealthy(): Promise<boolean> {
  try {
    await redis.ping()
    return true
  } catch (error) {
    log.error({ error }, 'Queue health check failed')
    return false
  }
}
