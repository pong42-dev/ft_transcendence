import { Static, Type } from '@sinclair/typebox'
import { StringSchema } from '../../common.js'

export const InitUser2FASchema = Type.Object({
	qrCodeUrl: StringSchema,
	secret: StringSchema,
	token: StringSchema
})
export interface InitUser2FA extends Static<typeof InitUser2FASchema> {}
