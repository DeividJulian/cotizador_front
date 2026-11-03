import { OperatorFunction, map } from 'rxjs';

import { StrictHttpResponse } from '../../api/strict-http-response';

/** The generated functions return the whole HTTP response; the services only need the body. */
export function body<T>(): OperatorFunction<StrictHttpResponse<T>, T> {
  return map((response) => response.body);
}
