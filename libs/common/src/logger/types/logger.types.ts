export type LogPayload = {
  msg: string;
  action: string;
  service: string;
  userId?: number;
  data?: any;
  error?: any;

  table?: string;
  status?: number;
  rawError?: string;
};
