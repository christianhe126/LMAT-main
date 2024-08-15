using apiService as service from '../../srv/apiService';

annotate apiService.Entity {
  entityID @Sap.hierarchy.node.for;
  //hierarchyLevel @Sap.hierarchy.level.for;
  parentEntityID @Sap.hierarchy.parent.node.for;
  //drillState @Sap.hierarchy.drill.state.for;
}

annotate apiService.Entity with @(
  UI: {
    Identification: [
      { Value: content }
    ],
    SelectionFields: [ content ],
    LineItem: [
      { $Type: 'UI.DataField', Value: content, Label: 'Content' }
    ],
    HeaderInfo: {
      $Type: 'UI.HeaderInfoType',
      TypeName: 'Node',
      TypeNamePlural: 'Nodes',
      Title: { Value: content },
      Content: { Value: content }
    }
  }
);