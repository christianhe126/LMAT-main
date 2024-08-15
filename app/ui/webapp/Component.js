/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "ui/model/models",
        "sap/ui/model/odata/v2/ODataModel",
        "sap/ui/model/json/JSONModel"
    ],
    function (UIComponent, Device, models, ODataModel, JSONModel) {
        "use strict";

        return UIComponent.extend("ui.Component", {
            metadata: {
                manifest: "json"
            },
            buildTree: function(entities) {
                const map = new Map(entities.map(entity => [entity.entityID, { ...entity, children: [] }]));
                const tree = [];
                entities.forEach(entity => {
                  if (entity.parent_entityID) {
                    const parent = map.get(entity.parent_entityID);
                    parent.children.push(map.get(entity.entityID));
                  } else {
                    tree.push(map.get(entity.entityID));
                  }
                });
                return tree;
            },
            fetchData: function(url, buildDataFunction = null) {
                return new Promise((resolve, reject) => {
                    jQuery.ajax({
                        type: "GET",
                        contentType: "application/json",
                        url: url,
                        success: function (data, status) {
                            if(buildDataFunction) {
                                data.value = buildDataFunction(data.value);
                            }
                            resolve(data); // Resolve the promise with the processed data
                        },
                        error: function (xhr, status) {
                            reject(status); // Reject the promise with the status
                        }
                    });
                });
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");
        
                // Entities 1.0
                //var oModel = new ODataModel("http://localhost:4004/odata/v2/browse/entities")
                //this.setModel(oModel, "entities2")

                /*
                // Entities 2.0
                this.fetchData("/browse/entities?$expand=content($expand=contentType)",this.buildTree) //"/browse/entities?$filter=entityID eq 1"
                    .then(data => {
                        this.setModel(new JSONModel(data), "entities");
                        console.log(data)
                    }
                )

                //Contents
                this.fetchData("/browse/contents")
                    .then(data => {
                        this.setModel(new JSONModel(data), "contents");
                    }
                )
*/
                //ContentTypes
                this.fetchData("/browse/contentTypes")
                    .then(data => {
                        this.setModel(new JSONModel(data), "contentTypes");
                    }
                )
                


                //oModel = new ODataModel("/browse/entities?$expand=content($expand=contentType)");
                //this.setModel(oModel, "entities")
                
                //console.log(this.getModel("entities").getData())

                /*
                // Create the OData model based on the data source from the manifest
                var oModel = new ODataModel({
                    serviceUrl: this.getManifestEntry("/sap.app/dataSources/mainService/uri"),
                    synchronizationMode: "None",
                    operationMode: "Server",
                    autoExpandSelect: true
                });*/
                
                //this.setModel(oModel, "mainModel");
                
                /*
                var oModel = this.getModel();
                console.log("API Service Model")
                console.log(oModel)
                oModel.read("/Entity", {
                    success: function (data) {
                        console.log("success")
                        console.log(data)
                    },
                    error: function(error) {
                        // Handle any errors that occur during the request
                        console.error("Error loading data:", error);
                    }


                })

                */

                
                
                /*
                var oModel = new JSONModel();
                var query = jQuery.ajax({
                    type: "GET",
                    contentType: "application/json",
                    url: "/browse/resource",
                    success: function (data, status) {
                        oModel.setData(data);
                    },
                    fail: function (data, status) {
                        console.log(status)
                    }
                })
                this.setModel(oModel, "resourceService")

                var oModel2 = new JSONModel();
                var query = jQuery.ajax({
                    type: "GET",
                    contentType: "application/json",
                    url: "/browse/link",
                    success: function (data, status) {
                        const groupedData = data.value.reduce((accumulator, item) => {
                            if (!accumulator[item.resourceID]) {
                                accumulator[item.resourceID] = { resourceID: item.resourceID, content: item.content, contentType: item.contentType, nodes: [] };
                            }
                            accumulator[item.resourceID].nodes.push({ content: item.content, contentType: item.contentType });
                            return accumulator;
                        });
                        var aGroupedDataArray = Object.values(groupedData);
                        oModel2.setData({value: aGroupedDataArray});

                    },
                    fail: function (data, status) {
                        console.log(status)
                    }
                })
                this.setModel(oModel2, "links")

                var oModel3 = new JSONModel();
                var query = jQuery.ajax({
                    type: "GET",
                    contentType: "application/json",
                    url: "/browse/presentation",
                    success: function (data, status) {
                        var aData = this.buildTree(data.value);
                        oModel3.setData({value: aData});
                    }.bind(this),
                    fail: function (data, status) {
                        console.log(status)
                    }
                })
                this.setModel(oModel3, "presentation")

                var oModel4 = new JSONModel();
                var query = jQuery.ajax({
                    type: "GET",
                    contentType: "application/json",
                    url: "/browse/contentTypes",
                    success: function (data, status) {
                        oModel4.setData(data);
                    },
                    fail: function (data, status) {
                        console.log(status)
                    }
                })
                this.setModel(oModel4, "contentTypes")*/
            }
            
        });
    }
);