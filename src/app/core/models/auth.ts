export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  last_login_at: string | null;
}

export interface Session {
  token: string;
  user: User;
}

export interface RegisterInput {
  name: string;
  email: string;
}

export interface CodeSent {
  message: string;
  email: string;
}
