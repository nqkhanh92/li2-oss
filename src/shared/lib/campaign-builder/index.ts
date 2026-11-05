import { GroupCondition } from '@/ee/features/campaigns/builder/nodes/conditions/type'
import { NodeType } from '@/ee/features/campaigns/builder/nodes/type'
import { ConditionBranch, SavedPath } from '@/shared/types/campaigns'
import { type Edge } from '@xyflow/react'

export function generateTriggerCentricPaths(
  nodes: NodeType<any>[],
  edges: Edge[]
): Record<string, SavedPath[]> {
  // Create fast lookup maps
  const nodeMap = new Map<string, NodeType<any>>()
  const incomingEdges = new Map<string, Edge[]>()

  nodes.forEach((node) => nodeMap.set(node.id, node))
  edges.forEach((edge) => {
    if (!incomingEdges.has(edge.target)) {
      incomingEdges.set(edge.target, [])
    }
    incomingEdges.get(edge.target)!.push(edge)
  })

  const result: Record<string, SavedPath[]> = {}

  // Find all triggers
  const triggers = nodes.filter((n) => n.data.group === 'trigger')

  // Initialize result for each trigger
  triggers.forEach((trigger) => {
    result[trigger.id] = []
  })

  // Find all actions and trace back to triggers
  const actions = nodes.filter((n) => n.data.group === 'action')

  for (const action of actions) {
    const paths = findPathsFromTriggers(action.id)

    // Group paths by trigger
    paths.forEach((path) => {
      const triggerId = path.path[0]
      if (result[triggerId]) {
        result[triggerId].push({
          actionId: action.id,
          path: path.path,
          conditionBranches: path.conditionBranches,
        })
      }
    })
  }

  function findPathsFromTriggers(actionId: string): SavedPath[] {
    const paths: SavedPath[] = []
    const visited = new Set<string>()

    dfs(actionId, [actionId], [], visited, paths)
    return paths
  }

  function dfs(
    currentId: string,
    path: string[],
    conditionBranches: ConditionBranch[],
    visited: Set<string>,
    results: SavedPath[]
  ): void {
    if (visited.has(currentId)) return
    visited.add(currentId)

    const current = nodeMap.get(currentId)
    if (!current) {
      visited.delete(currentId)
      return
    }

    // If we reached a trigger, we found a complete path
    if (current.data.group === 'trigger') {
      results.push({
        actionId: path[path.length - 1],
        path: [...path],
        conditionBranches: [...conditionBranches],
      })
      visited.delete(currentId)
      return
    }

    const incomers = incomingEdges.get(currentId) || []

    for (const edge of incomers) {
      const incomer = nodeMap.get(edge.source)
      if (!incomer) continue

      const newPath = [incomer.id, ...path]
      let newConditionBranches = conditionBranches

      if (incomer.data.group === 'condition') {
        const expectedResult = edge.sourceHandle?.includes('true') ?? false
        newConditionBranches = [
          {
            nodeId: incomer.id,
            expectedResult,
            condition: incomer.data.condition as GroupCondition,
          },
          ...conditionBranches,
        ]
      }

      dfs(incomer.id, newPath, newConditionBranches, visited, results)
    }

    visited.delete(currentId)
  }

  return result
}

// Runtime execution function (for reference)
export async function executeTrigger(
  triggerId: string,
  userContext: any,
  db: any // Your database interface
) {
  // O(1) database lookup - only get paths for this trigger
  const paths = await db.getPathsForTrigger(triggerId)

  for (const path of paths) {
    // Check if all conditions are met
    const allConditionsMet = path.conditionBranches.every(
      (branch: any) => evaluateCondition(branch.condition, userContext) === branch.expectedResult
    )

    if (allConditionsMet) {
      await executeAction(path.actionId, userContext)
    }
  }
}

// Helper function (implement based on your condition logic)
function evaluateCondition(condition: GroupCondition, context: any): boolean {
  // Your condition evaluation logic here
  return true // placeholder
}

// Helper function (implement based on your action logic)
async function executeAction(actionId: string, context: any): Promise<void> {
  // Your action execution logic here
}
