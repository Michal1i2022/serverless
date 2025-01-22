import { MongoClient } from "mongodb";
import AWS from "aws-sdk";

const uri = process.env.MONGO_URL;
const client = new MongoClient(uri);

const apiGateway = new AWS.ApiGatewayManagementApi({
  endpoint: process.env.WS_API_URL, // Musi być w formacie "https://..."
});

export const handler = async (event) => {
  const route = event.requestContext.routeKey;
  const connectionId = event.requestContext.connectionId;

  await client.connect();
  const db = client.db("chatApp");
  const connections = db.collection("connections");

  try {
    if (route === "$connect") {
      console.log(`🔗 Nowe połączenie: ${connectionId}`);
      await connections.insertOne({ connectionId });
      return { statusCode: 200, body: "Connected" };
    }

    if (route === "$disconnect") {
      console.log(`🔌 Rozłączenie: ${connectionId}`);
      await connections.deleteOne({ connectionId });
      return { statusCode: 200, body: "Disconnected" };
    }

    if (route === "sendMessage") {
      const { userId, to, msg } = JSON.parse(event.body);
      console.log(`📨 Wiadomość od ${userId} do ${to}: ${msg}`);

      await connections.updateOne(
        { connectionId },
        { $set: { userId } },
        { upsert: true }
      );

      const recipient = await connections.findOne({ userId: to });

      if (recipient) {
        await apiGateway
          .postToConnection({
            ConnectionId: recipient.connectionId,
            Data: JSON.stringify({ from: userId, msg }),
          })
          .promise();
        console.log(`📩 Wiadomość wysłana do ${to}`);
        return { statusCode: 200, body: "Message sent" };
      } else {
        console.log("❌ Odbiorca nie znaleziony.");
        return { statusCode: 404, body: "Recipient not found" };
      }
    }

    return { statusCode: 400, body: "Invalid route" };
  } catch (error) {
    console.error("❌ Błąd WebSocket:", error);
    return { statusCode: 500, body: "Błąd serwera" };
  } finally {
    await client.close();
  }
};
