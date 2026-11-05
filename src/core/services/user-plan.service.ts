import { BaseService } from "./base.service";
import { logger } from "@/infrastructure/logging/logger";
import {
  userPlanRepo,
  UserPlanRepository,
} from "../repositories/user-plan.repository";

const log = logger.child({ module: "user-plan-service" });
export class UserPlanService extends BaseService<UserPlanRepository> {
  constructor(repo: UserPlanRepository) {
    super(repo);
  }

  async findOne(userId?: string) {
    return await this.repo.findOne(userId);
  }

  async update(
    userId: string,
    data: {
      expires_at: string | null;
      plan_id: string | null;
      subscribed_at: string | null;
    }
  ) {
    return await this.repo.update(userId, data);
  }
}

export const userPlanService =
  globalThis._userPlanService ?? new UserPlanService(userPlanRepo);

if (process.env.NODE_ENV !== "production")
  globalThis._userPlanService = userPlanService;