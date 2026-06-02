/**
 * Discriminated union of all operations in Javascript.
 * 
 * @typedef {('ADD_NODE'|'UPDATE_NODE_POSITION'|'UPDATE_NODE_LABEL'|'UPDATE_NODE_META'|'RESIZE_NODE'|'DELETE_NODE'|'ADD_EDGE'|'UPDATE_EDGE_LABEL'|'UPDATE_EDGE_META'|'DELETE_EDGE'|'MOVE_SELECTION'|'RENAME_PROJECT')} OpType
 * 
 * @typedef {Object} WsOperation
 * @property {string} opId - client-generated UUID
 * @property {OpType} type - type of operation
 * @property {string} projectId - UUID of project
 * @property {string} userId - UUID of user (filled server-side)
 * @property {number} baseVersion - client's known version before op
 * @property {any} payload - op-specific data
 */

const OP_TYPES = Object.freeze([
  "ADD_NODE",
  "UPDATE_NODE_POSITION",
  "UPDATE_NODE_LABEL",
  "UPDATE_NODE_META",
  "RESIZE_NODE",
  "DELETE_NODE",
  "ADD_EDGE",
  "UPDATE_EDGE_LABEL",
  "UPDATE_EDGE_META",
  "DELETE_EDGE",
  "MOVE_SELECTION",
  "RENAME_PROJECT",
]);

module.exports = {
  OP_TYPES,
};
