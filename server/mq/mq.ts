import { Kafka, type Consumer, type Producer } from "kafkajs";
import type { JoinMessage, MovePlayerMessage } from "../types/mqMessage";
import type { Player } from "../types/player";
import type { GenericPayload, JoinPayload } from "../types/message";
import { players } from "..";
import webSocketManager from "../ws/manager";
import { events } from "../env";
import playerService from "../services/player";

class MqAdapter {
  static instance = null as MqAdapter | null;
  producer = null as Producer | null;
  consumers = {} as Record<string, Consumer>;

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
      this.initConsumer(kafka, clientId)
        .then(() => {
          console.log("All Kafka consumer connected successfully.");
        })
        .catch((error) => {
          console.error("Failed to connect Kafka consumer:", error);
          throw error;
        });

      MqAdapter.instance = this;
    }

    return MqAdapter.instance;
  }

  async initConsumer(kafka: Kafka, clientId: string) {
    this.consumers = {};
    for (const event of Object.values(events)) {
      const consumer = kafka.consumer({
        groupId: `${clientId}:${event}`,
        heartbeatInterval: 3000, // milliseconds
        sessionTimeout: 30000, // milliseconds
      });
      consumer
        .connect()
        .then(() => {
          this.consumers[event] = consumer;
          // run consumer
          return this.consumeMessage(event, playerService.getFunction(event));
        })
        .catch((error) => {
          console.error("Failed to connect Kafka consumer:", error);
          throw error;
        });
    }
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
    if (!this.consumers.hasOwnProperty(topic)) {
      console.error("Kafka consumer is not initialized");
      return;
    }
    const consumer = this.consumers[topic];
    console.log(`Kafka consumer for ${topic} is initialized`);
    try {
      await consumer.subscribe({ topic });
      await consumer.run({
        partitionsConsumedConcurrently: 1,
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
export default mq;
