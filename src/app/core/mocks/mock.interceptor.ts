import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, of, throwError } from 'rxjs';

import * as api from '../../api/functions';
import type { CodeSent, Message, ProposalOut, SessionOut } from '../../api/models';
import { API_URL } from '../config/api.config';
import {
  MOCK_AI_STATUS,
  MOCK_MARKET_RATES,
  MOCK_QUOTE,
  MOCK_QUOTES,
  MOCK_RATES,
  MOCK_SCOPE_ESTIMATE,
  MOCK_SIMILAR,
  MOCK_STATS,
  MOCK_USER,
} from './mock-data';

const STORAGE_KEY = 'cotizador.mock';

/**
 * Mock mode: open the app with ?mock=1 to work without the backend (?mock=0 turns it off). The routes are the
 * PATH of each generated function, so they follow the contract. Any 6-digit code logs in.
 */
export function mockEnabled(): boolean {
  try {
    const flag = new URLSearchParams(location.search).get('mock');
    if (flag === '1') localStorage.setItem(STORAGE_KEY, '1');
    if (flag === '0') localStorage.removeItem(STORAGE_KEY);
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** JWT-shaped token that expires in a day (the front only reads the expiry; the signature is fake). */
function mockToken(): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  return `${encode({ alg: 'none' })}.${encode({ sub: String(MOCK_USER.id), exp: Math.floor(Date.now() / 1000) + 86400 })}.mock`;
}

const codeSent = { message: 'Modo de prueba: escribe cualquier código de 6 dígitos', email: MOCK_USER.email } satisfies CodeSent;
const proposal = { quote_id: MOCK_QUOTE.id, proposal: MOCK_QUOTE.proposal } satisfies ProposalOut;
const deleted = { message: 'Eliminado (modo de prueba)' } satisfies Message;

type Route = [method: string, path: string, reply: () => unknown];

const ROUTES: Route[] = [
  ['POST', api.register.PATH, () => codeSent],
  ['POST', api.login.PATH, () => codeSent],
  ['POST', api.verify.PATH, () => ({ token: mockToken(), user: MOCK_USER }) satisfies SessionOut],
  ['GET', api.currentAccount.PATH, () => MOCK_USER],
  ['GET', api.listQuotes.PATH, () => MOCK_QUOTES],
  ['POST', api.createQuote.PATH, () => MOCK_QUOTE],
  ['GET', api.readQuote.PATH, () => MOCK_QUOTE],
  ['PUT', api.updateQuote.PATH, () => MOCK_QUOTE],
  ['DELETE', api.deleteQuote.PATH, () => deleted],
  ['POST', api.analyzeQuote.PATH, () => MOCK_QUOTE],
  ['POST', api.changeStatus.PATH, () => MOCK_QUOTE],
  ['GET', api.similarQuotes.PATH, () => MOCK_SIMILAR],
  ['POST', api.addItem.PATH, () => MOCK_QUOTE],
  ['PUT', api.updateItem.PATH, () => MOCK_QUOTE],
  ['DELETE', api.deleteItem.PATH, () => MOCK_QUOTE],
  ['POST', api.generateProposal.PATH, () => proposal],
  ['PATCH', api.updateProposalSections.PATH, () => proposal],
  ['GET', api.listRates.PATH, () => MOCK_RATES],
  ['GET', api.marketRates.PATH, () => MOCK_MARKET_RATES],
  ['POST', api.resetToMarket.PATH, () => MOCK_RATES],
  ['POST', api.createRate.PATH, () => MOCK_RATES[0]],
  ['PUT', api.updateRate.PATH, () => MOCK_RATES[0]],
  ['DELETE', api.deleteRate.PATH, () => deleted],
  ['GET', api.myStats.PATH, () => MOCK_STATS],
  ['POST', api.loadExampleQuotes.PATH, () => ({ message: 'Ejemplos cargados (modo de prueba)', summary: { quotes: 4 } })],
  ['POST', api.estimateScope.PATH, () => MOCK_SCOPE_ESTIMATE],
  ['POST', api.simulatePrice.PATH, () => MOCK_QUOTE.financials],
  ['GET', api.aiStatus.PATH, () => MOCK_AI_STATUS],
];

/** '/quotes/{quote_id}' matches '/quotes/7': each {param} stands for one path segment. */
function matches(template: string, path: string): boolean {
  const segments = template.split('/');
  const parts = path.split('/');
  return segments.length === parts.length && segments.every((s, i) => (s.startsWith('{') ? parts[i] !== '' : s === parts[i]));
}

export function findMock(method: string, url: string): Route | undefined {
  if (!url.startsWith(API_URL)) return undefined;
  const path = url.slice(API_URL.length).split('?')[0];
  return ROUTES.find(([m, template]) => m === method && matches(template, path));
}

export const mockInterceptor: HttpInterceptorFn = (request, next) => {
  if (!mockEnabled() || !request.url.startsWith(API_URL)) return next(request);
  const route = findMock(request.method, request.url);
  if (!route) {
    const error = new HttpErrorResponse({
      status: 501,
      url: request.url,
      error: { detail: 'Esta acción no está disponible en el modo de prueba' },
    });
    return throwError(() => error).pipe(delay(150));
  }
  return of(new HttpResponse({ status: 200, url: request.url, body: structuredClone(route[2]()) })).pipe(delay(150));
};
