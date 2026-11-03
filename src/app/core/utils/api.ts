import { OperatorFunction, map } from 'rxjs';
import * as z from 'zod/mini';

import { StrictHttpResponse } from '../../api/strict-http-response';

/** The server answered, but not with the shape the contract promises. Its message is shown to the user. */
export class ContractError extends Error {
  override readonly name = 'ContractError';

  constructor(
    readonly what: string,
    readonly issues: string,
  ) {
    super(
      `El servidor respondió ${what} con un formato inesperado. Recarga la página; si sigue pasando, avísanos.`,
    );
  }
}

/**
 * Parse, don't just validate: the body goes through the Zod schema and what continues is the PARSED value (unknown
 * fields removed). If it does not match, the details go to the console and the screen gets a ContractError.
 */
export function parsed<S extends z.ZodMiniType>(
  schema: S,
  what: string,
): OperatorFunction<StrictHttpResponse<unknown>, z.output<S>> {
  return map((response) => parse(schema, response.body, what, response.url ?? ''));
}

export function parse<S extends z.ZodMiniType>(
  schema: S,
  value: unknown,
  what: string,
  source = '',
): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issues = z.prettifyError(result.error);
    console.error(
      `[contrato] ${what} no cumple el esquema${source ? ` (${source})` : ''}:\n${issues}`,
    );
    throw new ContractError(what, issues);
  }
  return result.data;
}
