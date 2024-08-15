sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/ComboBox",
    "sap/ui/core/Item",
    "../model/utility",
    "../model/formatter"
], function (Controller, JSONModel, Dialog, Button, Label, ComboBox, Item, utility, formatter) {
    "use strict";

    return Controller.extend("ui.controller.exportDialog", {
        formatter: formatter,

        onInit: function () {
            this.oDialogExport = this.byId("exportDialog");
            this.oModel = this.getView().getModel("myModel");
            var json = new JSONModel({fileFormats : ["CSV", "XLSX"], layouts : ["Layout 1", "Layout 2"]});
            this.getView().setModel(json);
        },

        open: function (_this) {
            this.oDialogExport.open();
            this.master = _this;
            // Metadata Filling
            var metadata = {
                Items: [
                    { key: "Title", value:  this.master.name },
                    { key: "Author", value: "UCC Technical University of Munich" },
                    { key: "Product", value: "All" },
                    { key: "Level", value: "Advanced" },
                    { key: "Focus", value: "Programming" },
                    { key: "Version", value: "1.0" },
                    { key: "Software", value: "" },
                    { key: "Learning Objectives", value: "" },
                    { key: "Motivation", value: "" },
                    { key: "Prerequisites", value: "" },
                    { key: "Content", value: "" },
                    { key: "Lecture Notes", value: "" }
                ]
            };

            try {
                var json = JSON.parse(this.getView().getModel("myModel").getProperty("/document('" + this.master.documentID + "')/metadata"))
                if(json) {
                    metadata = json;
                }
            } catch (e) {   
                console.log(e);
            }

            var oModel = new sap.ui.model.json.JSONModel(metadata);
            this.getView().setModel(oModel, "metadata");
        },

        metadataInputChange: async function (oEvent) {
            var oInput = oEvent.getSource();
            var oContext = oInput.getBindingContext("metadata");
            var sPath = oContext.getPath();
            var sNewValue = oInput.getValue();
            var oModel = this.getView().getModel("metadata");
            oModel.setProperty(sPath + "/value", sNewValue);

            // Save metadata
            this.getView().getModel("myModel").setProperty("/document('" + this.master.documentID + "')/metadata", JSON.stringify(oModel.getProperty("/")));
            await this.getView().getModel("myModel").submitChanges();
        },

        templateSelectionChange: function (oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedItem").getKey();
            var oFileBox = this.byId("fileBox");
            oFileBox.setVisible(sSelectedKey === "own");
        },
        
        onFileChange: async function (oEvent) {
            var that = this;
            var reader = new FileReader();
            var file = oEvent.getParameter("files")[0];

            reader.onload = async function(e) {
                var raw = e.target.result;
                this.template = await utility.arrayBufferToBase64(raw);
                console.log("Template loaded...")
            }.bind(this);

            reader.onerror = function(e) {
                sap.m.MessageToast.show("error");
            };
            reader.readAsArrayBuffer(file);
        },

        onExport: async function () {
            console.log("Exporting...")
            var sFileFormat = this.byId("fileFormatComboBox").getSelectedKey();
            var sTemplate = this.byId("templateComboBox").getSelectedKey();
            if(sTemplate !== "own") {
                this.template = sTemplate + sFileFormat;
            }
            var _metadata = JSON.stringify(this.getView().getModel("metadata").getProperty("/"));

            var oModel = this.getView().getModel("myModel");
            var source_path = "/document('" + this.master.documentID + "')/"
            oModel.read(source_path, {
                success: async function (oRowData, oResponse) { 
                    if(sFileFormat === ".html") {
                        const blob = new Blob([oRowData.source], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = (oRowData.name ? oRowData.name : "Presentation") + sFileFormat;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        return;
                    }
                    await oModel.callFunction("/export", {
                        method: "POST",
                        urlParameters: {documentID:this.master.documentID, title: oRowData.name, html: oRowData.source, fileFormat: sFileFormat, template: this.template, metadata: _metadata},
                        success: function (base64String) {
                            let blob = utility.base64ToBlob(base64String.export, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
                            
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                                a.href = url;
                                a.download = (oRowData.name ? oRowData.name : "Presentation") + sFileFormat;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                        }.bind(this),
                        error: function (error) {
                            console.log(error)
                        }
                    })
                    this.byId("exportDialog").close();
                }.bind(this),
                error: function (oError) {
                    console.error("Error while reading data", oError);
                }
            })
        },

        onCancel: function () {
            this.byId("exportDialog").close();
        },

        onDialogClose: function () {
            this.template = null;
            this.byId("fileUploader").clear();
            // Clean up if necessary
        }
    });
});
