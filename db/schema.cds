namespace LMAT.db;
using { cuid } from '@sap/cds/common';

entity document{
    key documentID: String;
    name: String;
    entities: Composition of many entities on entities.document = $self;
    source: LargeString;
    automations: Composition of many automations on automations.document = $self;
    reuse: Composition of many reuse on reuse.document = $self;
    metadata: String;
}

entity entities {
    // Key Attribute
    key entityID : UUID;

    // Foreign Keys
    document : Association to document;

    // Attributes
    parentNodeID : String;
    hierarchyLevel : Integer;
    drillState : String;
    order : Integer;

    source: LargeString;
    title: String;
}

entity automations {
    key document : Association to document;
    key tag : String;
    url : String;
    selector: String;
    result: String;
    lastUpdate: Timestamp;
    isScreenshot: Boolean;
    credentialsRequired: Boolean;
}

entity reuse {
    key document : Association to document;
    key tag : String;
    source : LargeString;
    published : Boolean;
}

