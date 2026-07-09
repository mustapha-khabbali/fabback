import { isCurrentUserId } from './userIdentity';

export function isNotificationVisibleForUser(notification, currentUser) {
  return !notification?.recipientId || isCurrentUserId(currentUser, notification.recipientId);
}

export function isUnreadNotificationForUser(notification, currentUser) {
  return isNotificationVisibleForUser(notification, currentUser)
    && (notification.status === 'unread' || notification.status === 'pending');
}
