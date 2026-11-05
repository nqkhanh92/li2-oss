import { Tables } from "@/shared/types/database.types";

export type TouchPointImportTasks = Tables<"touchpoint_import_tasks">;

export type TouchPointImportTasksDetail = TouchPointImportTasks & {
  profiles: Pick<Tables<"profiles">, "id" | "name" | "email">;
};
