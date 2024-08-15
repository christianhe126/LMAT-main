sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/ComboBox",
    "sap/ui/core/Item",
    "../model/formatter",
    "../model/utility",
], function (Controller, JSONModel, Dialog, Button, Label, ComboBox, Item, formatter, utility) {
    "use strict";

    return Controller.extend("ui.controller.reuseDialog", {
        formatter: formatter,

        onInit: function () {
            this.oDialogReuse = this.byId("reuseDialog");
            this.oModel = this.getView().getModel("myModel");
        },

        open: function () {
            return new Promise(function (resolve, reject) {
                this._resolve = resolve;
                this._reject = reject;

                this.oDialogReuse.open();
            }.bind(this));
                
        },

        projectSelectionChange: function (oEvent) {
            var oComboBox = oEvent.getSource();
            var oSelectedItem = oComboBox.getSelectedItem();
            var oContext = oSelectedItem.getBindingContext("myModel");
            this._documentID = oContext.getProperty("documentID");
            this.byId("entityComboBox").bindItems({
                path: "myModel>/document('" + this._documentID + "')/reuse",
                template: new Item({
                    key: "{myModel>tag}",
                    text: {
                        path: 'myModel>tag', 
                        formatter: formatter.parseTitle.bind(this)
                    }
                })
            });
        },

        onAdd: async function () {
            var oComboBox = this.byId("entityComboBox");
            var oSelectedItem = oComboBox.getSelectedItem();
            if (oSelectedItem) {
                var oContext = oSelectedItem.getBindingContext("myModel");
                var result = {sPath: oContext.sPath};
                this._resolve(result);
            } else {
                this._resolve(null);
            }
            this.byId("reuseDialog").close();
        },

        onCancel: function () {
            this.byId("reuseDialog").close();
        },

        onDialogClose: function () {
            // Clean up if necessary
        }
    });
});
