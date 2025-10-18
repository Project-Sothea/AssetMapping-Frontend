import { relations } from "drizzle-orm/relations";
import { pins, forms } from "./schema";

export const formsRelations = relations(forms, ({one}) => ({
	pin: one(pins, {
		fields: [forms.pinId],
		references: [pins.id]
	}),
}));

export const pinsRelations = relations(pins, ({many}) => ({
	forms: many(forms),
}));