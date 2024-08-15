using { LMAT.db as data } from '../db/schema';

service apiService @(path:'/browse') {

    // Entities
    entity document as projection on data.document;
    entity entities as projection on data.entities;
    entity automations as projection on data.automations;
    entity reuse as projection on data.reuse;

    // GET
    action getChildren(entityID: String) returns array of entities;

    // POST
    action createDocument(documentName: String) returns String;
    action updateDocument(documentID: String, source: String) returns String;
    action createEntry(source: String, title: String, contentTypeID: String, parentNodeID: String, drillState: String, hierarchyLevel: Integer, contentID: String, documentID: String) returns String;
    action deleteEntry(entityID: String) returns String;
    action syncAllAutomations(documentID: String, credentials: String) returns String;
    action export(documentID: String, title: String, html: String, automations: String, fileFormat: LargeString, template: LargeString, metadata: String) returns LargeString;
}
