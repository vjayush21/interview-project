import { User } from "./User.js";
import { OpenRouterCredential } from "./OpenRouterCredential.js";
import { Session } from "./Session.js";
import { Question } from "./Question.js";
import { Sitelog } from "./Sitelog.js";

// Relationships
User.hasOne(OpenRouterCredential, { foreignKey: "userId", onDelete: "CASCADE" });
OpenRouterCredential.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Session, { foreignKey: "userId", onDelete: "CASCADE" });
Session.belongsTo(User, { foreignKey: "userId" });

Session.hasMany(Question, { foreignKey: "sessionId", onDelete: "CASCADE" });
Question.belongsTo(Session, { foreignKey: "sessionId" });

export { User, OpenRouterCredential, Session, Question, Sitelog };

