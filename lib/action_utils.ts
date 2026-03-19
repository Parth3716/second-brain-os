"use server";

export type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

export function successResult<T = null>(data?: T): ActionResult<T> {
  return { success: true, data: data ?? (null as T) };
}

export function errorResult(message: string): ActionResult<never> {
  return { success: false, error: message };
}
