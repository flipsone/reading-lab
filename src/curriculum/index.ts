import raw from "./lesson-001.json";
import { lessonSchema } from "../domain/models";
export const lessonOne = lessonSchema.parse(raw);
