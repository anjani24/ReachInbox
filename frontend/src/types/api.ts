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
export interface EmailItem {
  id: string;
  toEmail: string;
  subject: string;
  preview: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  previewUrl: string | null;
  error: string | null;
}
export interface CreateCampaignInput {
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startAt: string;
  delayMs: number;
  hourlyLimit: number;
}

export interface CreateCampaignResult {
  campaignId: string;
  scheduled: number;
  duplicatesRemoved: number;
  firstSendAt: string;
  lastSendAt: string;
}
export type EmailTab = "scheduled" | "sent";