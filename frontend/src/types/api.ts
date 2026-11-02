export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  slackConnected: boolean;
}

export interface Sender {
  id: string;
  name: string;
  email: string;
}

export type EmailStatus = "scheduled" | "sending" | "sent" | "failed";

export interface EmailItem {
  id: string;
  toEmail: string;
  subject: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  previewUrl: string | null;
  error: string | null;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface EmailCounts {
  scheduled: number;
  sent: number;
}