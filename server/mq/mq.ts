import { Kafka, type Consumer, type Producer } from "kafkajs";
import type { MovePlayerMessage } from "../types/mqMessage";

class MqAdapter {
  static instance = null as MqAdapter | null;
  producer = null as Producer | null;
  consumer = null as Consumer | null;

  constructor(clientId: string, brokers: string[]) {
    if (!MqAdapter.instance) {
      const kafka = new Kafka({
        clientId: clientId,
        brokers: brokers,
      });

      this.producer = kafka.producer();
      this.producer
        .connect()
        .then(() => {
          console.log("Kafka producer connected successfully.");
        })
        .catch((error) => {
          console.error("Failed to connect Kafka producer:", error);
          throw error;
        });

      this.consumer = kafka.consumer({ groupId: clientId });
      this.consumer
        .connect()
        .then(() => {
          console.log("Kafka consumer connected successfully.");
        })
        .catch((error) => {
          console.error("Failed to connect Kafka consumer:", error);
          throw error;
        });

      MqAdapter.instance = this;
    }

    return MqAdapter.instance;
  }

  async sendMessage(topic: string, partition: number, message: any) {
    if (!this.producer) {
      console.error("Kafka producer is not initialized");
      return;
    }
    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(message), partition }],
      });
      console.log("Kafka message sent successfully: ", message);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }

  async consumeMessage(topic: string, callback: (message: any) => void) {
    if (!this.consumer) {
      console.error("Kafka consumer is not initialized");
      return;
    }
    console.log(`Kafka consumer for ${topic} is initialized`);
    try {
      await this.consumer.subscribe({ topic });
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          if (!message || !message.value) {
            return;
          }
          console.log("Kafka message recieve:", {
            topic,
            partition,
            value: message.value.toString(),
          });
          callback(JSON.parse(message.value.toString()));
        },
      });
    } catch (error) {
      console.error("Failed to consume message:", error);
    }
  }
}

const mq = new MqAdapter("app", ["localhost:9092"]);

// movePlayer consumer
mq.consumeMessage("movePlayer", async (message: MovePlayerMessage) => {
  console.log("movePlayer message received:", message);
});
export default mq;
