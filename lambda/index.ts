import { Router } from '@aws-lambda-powertools/event-handler/http';
import type { Context } from 'aws-lambda';

type ipmsEvent = {
}

const app = new Router();

const healthCheck = async () => ({ status: 'ok' });

app.get('/v1', () => {
  return { message: 'ok' };
});
app.get('/v1/health', healthCheck);


export const handler = async (event: ipmsEvent, context: Context) =>
  app.resolve(event, context);
