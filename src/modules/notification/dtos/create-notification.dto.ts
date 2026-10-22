export interface CreateNotificationDto {
  userId: number;
  title: string;
  message: string;
  metadata?: any;
}
