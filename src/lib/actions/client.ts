import * as auth from "@/lib/auth/actions";
import * as dinheiro from "@/lib/dinheiro/actions";
import * as events from "@/lib/events/actions";
import * as faculdade from "@/lib/faculdade/actions";
import * as origins from "@/lib/origins/actions";
import * as projects from "@/lib/projects/actions";
import * as sessions from "@/lib/sessions/actions";
import * as tasks from "@/lib/tasks/actions";
import * as treino from "@/lib/treino/actions";
import { withPayPrompt } from "./pay-prompt";
import { resilient } from "./resilient";

/*
 * Server Actions para chamar dos componentes. Sem internet (ou com o servidor fora),
 * a falha vira `{ ok: false }` e um toast — em vez de derrubar a tela inteira.
 * Componentes importam daqui, não direto de lib/<domínio>/actions.
 */

export const signIn = resilient(auth.signIn);
export const signUp = resilient(auth.signUp);

export const payTaskLink = resilient(dinheiro.payTaskLink);
export const setTaskStatus = withPayPrompt(resilient(tasks.setTaskStatus), payTaskLink);
export const updateTask = resilient(tasks.updateTask);
export const pauseTask = resilient(tasks.pauseTask);
export const snoozeTask = resilient(tasks.snoozeTask);

export const createOrigin = resilient(origins.createOrigin);
export const renameOrigin = resilient(origins.renameOrigin);
export const moveOrigin = resilient(origins.moveOrigin);
export const deleteOrigin = resilient(origins.deleteOrigin);
export const saveOriginNotes = resilient(origins.saveOriginNotes);
export const addOriginLink = resilient(origins.addOriginLink);
export const removeOriginLink = resilient(origins.removeOriginLink);
export const createOriginTask = resilient(origins.createOriginTask);

export const createProject = resilient(projects.createProject);
export const updateProject = resilient(projects.updateProject);
export const pauseProject = resilient(projects.pauseProject);
export const resumeProject = resilient(projects.resumeProject);
export const finishProject = resilient(projects.finishProject);
export const reopenProject = resilient(projects.reopenProject);
export const saveProjectNotes = resilient(projects.saveProjectNotes);
export const addProjectLink = resilient(projects.addProjectLink);
export const removeProjectLink = resilient(projects.removeProjectLink);
export const createProjectTask = resilient(projects.createProjectTask);

export const createAssessment = resilient(faculdade.createAssessment);
export const updateAssessment = resilient(faculdade.updateAssessment);
export const setAssessmentDone = resilient(faculdade.setAssessmentDone);
export const deleteAssessment = resilient(faculdade.deleteAssessment);
export const createAssessmentTask = resilient(faculdade.createAssessmentTask);
export const setSubjectArchived = resilient(faculdade.setSubjectArchived);

export const createEvent = resilient(events.createEvent);
export const updateEvent = resilient(events.updateEvent);
export const deleteEvent = resilient(events.deleteEvent);

export const startSession = resilient(sessions.startSession);
export const endSession = resilient(sessions.endSession);

export const createEntry = resilient(dinheiro.createEntry);
export const updateEntry = resilient(dinheiro.updateEntry);
export const deleteEntry = resilient(dinheiro.deleteEntry);
export const payPlanned = resilient(dinheiro.payPlanned);
export const createBill = resilient(dinheiro.createBill);
export const updateBill = resilient(dinheiro.updateBill);
export const endBill = resilient(dinheiro.endBill);
export const payBill = resilient(dinheiro.payBill);
export const unpayBill = resilient(dinheiro.unpayBill);
export const createCard = resilient(dinheiro.createCard);
export const updateCard = resilient(dinheiro.updateCard);
export const setCardArchived = resilient(dinheiro.setCardArchived);
export const deleteCard = resilient(dinheiro.deleteCard);
export const setInvoicePaid = resilient(dinheiro.setInvoicePaid);
export const createMoneyTask = resilient(dinheiro.createMoneyTask);

export const startWorkout = resilient(treino.startWorkout);
export const addWorkoutEntry = resilient(treino.addWorkoutEntry);
export const updateWorkoutEntry = resilient(treino.updateWorkoutEntry);
export const removeWorkoutEntry = resilient(treino.removeWorkoutEntry);
export const finishWorkout = resilient(treino.finishWorkout);
export const setWorkoutDate = resilient(treino.setWorkoutDate);
export const deleteWorkout = resilient(treino.deleteWorkout);
export const createExercise = resilient(treino.createExercise);
export const updateExercise = resilient(treino.updateExercise);
export const setExerciseArchived = resilient(treino.setExerciseArchived);
export const createPlan = resilient(treino.createPlan);
export const createPlanFromWorkout = resilient(treino.createPlanFromWorkout);
export const renamePlan = resilient(treino.renamePlan);
export const deletePlan = resilient(treino.deletePlan);
export const addPlanItem = resilient(treino.addPlanItem);
export const removePlanItem = resilient(treino.removePlanItem);
export const movePlanItem = resilient(treino.movePlanItem);
export const setWeeklyGoal = resilient(treino.setWeeklyGoal);
