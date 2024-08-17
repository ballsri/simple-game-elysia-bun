import type { ServerWebSocket } from "bun";
import type {
  Context,
  InputSchema,
  MergeSchema,
  TSchema,
  UnwrapRoute,
} from "elysia";
import type { TypeCheck } from "elysia/type-system";
import type { ElysiaWS } from "elysia/ws";

export type Socket = ElysiaWS<
  ServerWebSocket<{ validator?: TypeCheck<TSchema> | undefined }>,
  MergeSchema<UnwrapRoute<InputSchema<never>, {}>, any>,
  any
>;
