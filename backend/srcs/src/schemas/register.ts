import { Static, Type } from '@sinclair/typebox'
import { EmailSchema, StringSchema } from './common.js'

import { MultipartFile } from '@fastify/multipart';

export const RegisterSchema = Type.Object({
  email: EmailSchema,
  name: StringSchema,
  password: StringSchema,
});
export interface Register extends Static<typeof RegisterSchema> {}

export interface RegisterFormData extends Register {
  files: Record<string, MultipartFile>;
}
