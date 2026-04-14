import { User } from "./User";
import { OpenRouterCredential } from "./OpenRouterCredential";
import { Session } from "./Session";
import { Question } from "./Question";
import { Sitelog } from "./Sitelog";

// Relationships
User.hasOne(OpenRouterCredential, { foreignKey: "userId", onDelete: "CASCADE" });
OpenRouterCredential.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Session, { foreignKey: "userId", onDelete: "CASCADE" });
Session.belongsTo(User, { foreignKey: "userId" });

Session.hasMany(Question, { foreignKey: "sessionId", onDelete: "CASCADE" });
Question.belongsTo(Session, { foreignKey: "sessionId" });

export { User, OpenRouterCredential, Session, Question, Sitelog };

