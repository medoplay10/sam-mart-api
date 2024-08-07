import { Injectable } from '@nestjs/common';
import { DataMessagePayload, MessagingPayload } from 'firebase-admin/lib/messaging/messaging-api';
import { FcmService } from 'nestjs-fcm';

@Injectable()
export class FcmIntegrationService {
  constructor(private readonly fcmService: FcmService) { }

  async send(token: string, title: string, body: string, data?: DataMessagePayload): Promise<void> {
    const payload: MessagingPayload = {
      notification: {
        title,
        body,
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
        sound: "default"
      },
      data: {
        "click_action": "FLUTTER_NOTIFICATION_CLICK",
        ...data,
      },

    };
    const res = await this.fcmService.sendNotification([token], payload, false);
    console.log(res)
  }
  async sendToAll(token: string[], title: string, body: string, data?: DataMessagePayload,image_url?:string): Promise<void> {
   
    const payload: MessagingPayload = {
      notification: {
        title,
        body,
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
        sound: "default"
      },
      data: {
        "click_action": "FLUTTER_NOTIFICATION_CLICK",
        ...data,
      },

    };
   
    const res = await this.fcmService.sendNotification(token, payload, false,image_url);
    console.log(res)
  }
}
