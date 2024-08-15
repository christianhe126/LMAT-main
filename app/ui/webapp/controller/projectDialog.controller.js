sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, UIComponent, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("ui.controller.projectDialog", {

        onInit: function () {
            this.oDialog = this.byId("projectDialog");
            //this.oModel = new sap.ui.model.odata.v2.ODataModel("myModel");
            //this.getView().setModel(this.oModel);
            this.oModel = this.getView().getModel("myModel");
        },

        open: function (_this) {
            this.oDialog.open();
            this.master = _this;
        },

        onOpenPress: function () {
            var oSelectedItem = this.byId("projectList").getSelectedItem();
            if (oSelectedItem) {
                var oContext = oSelectedItem.getBindingContext("myModel");
                var oData = oContext.getObject();

                this.oDialog.close();

                this.master.getOwnerComponent().getRouter()
                    .navTo("document", {
                    documentID: oData.documentID
                });
            } else {
                console.log(oSelectedItem)
                MessageToast.show("Please select a project to open.");
            }
        },

        onCreateNewProject: async function () {
            this.oModel = this.getView().getModel("myModel");
            var sNewProjectName = this.byId("newProjectInput").getValue();
            if(!sNewProjectName || sNewProjectName === "") {
                MessageToast.show("Please fill in the document name");
                return;
            }

            var path = "/createDocument";

            await this.oModel.callFunction(path, {
                method: "POST",
                urlParameters: {documentName: sNewProjectName},
                success: function (response) {
                    this.byId("newProjectInput").setValue("");
                    console.log(response)
                }.bind(this),
                error: function (error) {
                    console.log(error)
                }
            })

            this.oModel.refresh();
        },

        onDialogClose: function () {
            // Cleanup or reset if necessary
        }

    });
});
