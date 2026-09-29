import * as auth from "@/lib/auth/actions";
import * as projects from "@/lib/projects/actions";
import * as sessions from "@/lib/sessions/actions";
import * as tasks from "@/lib/tasks/actions";
import { resilient } from "./resilient";

/*
 * Server Actions para chamar dos componentes. Sem internet (ou com o servidor fora),
 * a falha vira `{ ok: false }` e um toast — em vez de derrubar a tela inteira.
 * Componentes importam daqui, não direto de lib/<domínio>/actions.
 */

export const signIn = resilient(auth.signIn);
export const signUp = resilient(auth.signUp);

export const setTaskStatus = resilient(tasks.setTaskStatus);
export const updateTask = resilient(tasks.updateTask);
export const pauseTask = resilient(tasks.pauseTask);
export const snoozeTask = resilient(tasks.snoozeTask);

export const createArea = resilient(projects.createArea);
export const renameArea = resilient(projects.renameArea);
export const deleteArea = resilient(projects.deleteArea);
export const createProject = resilient(projects.createProject);
export const updateProject = resilient(projects.updateProject);
export const finishProject = resilient(projects.finishProject);
export const reopenProject = resilient(projects.reopenProject);
export const createProjectTask = resilient(projects.createProjectTask);

export const startSession = resilient(sessions.startSession);
export const endSession = resilient(sessions.endSession);
