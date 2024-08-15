sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "sap/m/MessageToast",
        "sap/m/Dialog",
        "sap/m/Button",
        "sap/ui/core/HTML",
        "sap/ui/model/Sorter",
        "sap/ui/model/odata/v2/ODataModel",
        "sap/ui/richtexteditor/RichTextEditor",
        "../model/utility",
        "../model/formatter"
    ],
    function(BaseController, JSONModel, MessageBox, MessageToast, Dialog, Button, HTML, Sorter, ODataModel, RichTextEditor, utility, formatter) {
      "use strict";
  
      return BaseController.extend("ui.controller.master", {
        formatter: formatter,

        onInit: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("document").attachPatternMatched(this._onDocumentRouteMatched, this);
            oRouter.getRoute("default").attachPatternMatched(this._onDefaultRouteMatched, this);
        },

        _onDocumentRouteMatched: function (oEvent) {
            this.documentID = oEvent.getParameter("arguments").documentID;
            try {
                this.getView().bindElement({
                    path: "myModel>/document('" + this.documentID + "')",
                    events: {
                        dataReceived: function (oData) {
                            if (!oData || !oData.getParameter("data")) {
                                this._onDefaultRouteMatched(); 
                                return;
                            }

                            this.getView().byId("TreeTable").getBinding("rows").sort(new Sorter("order", false));
                            utility.onRefreshTreeTable(this.byId("TreeTable")); 
                        }.bind(this),
                        error: function (oError) {
                            console.log("Error: " + oError);
                            this._onDefaultRouteMatched();
                        }.bind(this)
                    }
                });
            }
            catch (error) {
                console.log("Error2", error)
                this._onDefaultRouteMatched();
            }   
        },

        _onDefaultRouteMatched: function () {
            if (!this.oDialog) {
                this.oDialog = sap.ui.xmlview("ui.view.ProjectDialog");
                this.getView().addDependent(this.oDialog);
            }
            this.oDialog.getController().open(this);
        },

        onRowsUpdated: function (oEvent) {
            if(!this.first) {
                var oTable = this.byId("TreeTable");
                oTable.expandToLevel(0);
                this.first = true
            }   
        },

        onAfterRendering: function () {
            var iDelay = 500;
            var oController = this;

            setTimeout(function () {
                var height = this.calculateRichTextEditorHeight();
                if(height && height !== 0)
                    height = height + "px"
                else
                    height = "800px"

                this.oRichTextEditor = new RichTextEditor("richTextEditor", {
                    value: "{myModel>source}",
                    width: "100%",
                    height: height,
                    editorType: "TinyMCE5",
                    showGroupFont: false,
                    showGroupLink: false,
                    showGroupInsert: true,
                    showGroupClipboard: false,
                    showGroupTextAlign: false,
                    change: oController.onRichTextEditorChange.bind(oController),
                    customToolbar: true,
                    ready: oController.onRichTextEditorReady.bind(oController),
                    sanitizeValue: false,
                    visible: true
                });

                // Get the container and add the RichTextEditor to it
                var oRteContainer = oController.byId("rteContainer");
                oRteContainer.removeAllItems(); // Clear previous content if any
                oRteContainer.addItem(this.oRichTextEditor);
            }.bind(this), iDelay);
        },

        calculateRichTextEditorHeight: function () {
            var oPage = this.byId("masterPage");
            var iAvailableHeight = oPage.$().height();

            var oHeader = oPage.getCustomHeader();
            if (oHeader) {
                iAvailableHeight -= oHeader.$().outerHeight(true);
            }

            var oToolbar = oPage.getAggregation("_toolbar");
            if (oToolbar) {
                iAvailableHeight -= oToolbar.$().outerHeight(true);
            }

            var oFooter = oPage.getFooter();
            if (oFooter) {
                iAvailableHeight -= oFooter.$().outerHeight(true);
            }

            iAvailableHeight -= 100;
            return iAvailableHeight;
        },
        
        exportPressed: async function(oEvent) {
            this.name = this.getView().getModel("myModel").getProperty("/document('" + this.documentID + "')/name");
            console.log("Export pressed")
            if (!this.oDialogExport) {
                this.oDialogExport = sap.ui.xmlview("ui.view.ExportDialog");
                this.getView().addDependent(this.oDialogExport);
            }
            this.oDialogExport.getController().open(this);
        },

        onSyncAllPressed: async function() {
            var oModel = this.getView().getModel("myModel")
            var oTreeTable = this.getView().byId("TreeTable");
            oTreeTable.setBusy(true);

            var oModel = this.getView().getModel("myModel")
            var credentials = {};
            var promise = new Promise(async (resolve, reject) => {
                await oModel.read("/automations", {
                    filters: [
                        new sap.ui.model.Filter("document_documentID", sap.ui.model.FilterOperator.EQ, this.documentID)
                    ],
                    success: async (oData) => {
                        console.log(oData);
                        if(oData && oData.results) {
                            console.log(oData.results);
                            for (const element of oData.results) {
                                if(element.credentialsRequired) {
                                    var res = await this.openCredentialsDialog(element);
                                    if(res) 
                                        credentials[element.tag] = res;
                                }
                            }

                            resolve();
                        }
                    },
                    error: (oError) => {
                        MessageBox.show(utility.getResponseErrorText(oError));
                    }
                });
            });

            await promise;

            await oModel.callFunction("/syncAllAutomations", {
                method: "POST",
                urlParameters: {documentID: this.documentID, credentials: JSON.stringify(credentials)},
                success: function (response) {
                    console.log(response)
                    utility.onRefreshTreeTable(this.getView().byId("TreeTable"));
                    this.getView().byId("automationTable").getBinding("items").refresh();
                    oTreeTable.setBusy(false);
                    MessageToast.show("Synced!");

                }.bind(this),
                error: (oError) => {
                    MessageBox.show(utility.getResponseErrorText(oError));
                    oTreeTable.setBusy(false);
                }
            })
        },

        onRichTextEditorReady: function (oEvent) {
            var rte = oEvent.getSource();
            rte.addButtonGroup("table");
            rte.addButtonGroup("styleselect");
        },

        onRichTextEditorChange: async function (oEvent) {
            this.getView().getModel("myModel").setProperty("/document('" + this.documentID + "')" + "/source", oEvent.getSource().getValue());
            this.getView().getModel("myModel").submitChanges();
            var treeTable = this.getView().byId("TreeTable");
            var value = oEvent.getSource().getValue();
            var match = value.match(/<h1[^>]*>(.*?)<\/h1>/gi)
            if(!match)
                return;

            if(this.lastState !== match.join('')) {
                setTimeout(() => {
                    utility.onRefreshTreeTable(treeTable);
                }, 100);
            }
            this.lastState = match.join('');
        },

        onTagLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue();

            if (!sValue.startsWith("$")) {
                oInput.setValue("$" + sValue.replace(/^\$+/, ''));
            }
        },

        onReuseItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oContext = oItem.getBindingContext("myModel");
            var oData = oContext.getObject()
            console.log(oData);

            var oRTE = this.getView().byId("reuseRTE");
            oRTE.setEditable(true);
            oRTE.setValue(oData.source);
            oRTE.focus();

            this.getView().byId("reuseSharedTable").removeSelections();
        },

        onReuseSharedItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oContext = oItem.getBindingContext();
            var oModel = this.getView().getModel("myModel");
            oModel.read(oContext.sPath, {
                success: function (oData) {
                    if(oData) {
                        console.log(oData);
                        var oRTE = this.getView().byId("reuseRTE");
                        oRTE.setEditable(false);
                        oRTE.setValue(oData.source);
                        oRTE.focus();

                        this.getView().byId("reuseTable").removeSelections();
                    }
                }.bind(this),
                error: function (oError) {
                    console.log(oError);
                }
            });
        },

        onSaveReusePress: function () {
            var oModel = this.getView().getModel("myModel");
            var source = this.getView().byId("reuseRTE").getValue();
            var oTable = this.getView().byId("reuseTable");
            var item = oTable.getSelectedItem();        

            if (!item) {
                return;
            }

            oModel.setProperty(item.getBindingContext("myModel").getPath() + "/source", source);
            oModel.submitChanges({
                success: () => { 
                    console.log("Submitted"); 
                },
                error: (error) => { 
                    console.log("Create failed"); 
                    MessageBox.show("Create failed " + error);
                }
            }); 

        },

        onAddReusePress: function (data) {
            var source;
            var _name;
            if(!data.source || !data.name) {
                source = "";
                _name = "";
            }
            else {
                source = data.source;
                _name = data.name.replace(" ", "");
            }

            var oDialog = new Dialog({
                title: "Create a new Reuse Block:",
                content: [
                    new sap.m.Input("inputField", {
                        width: "100%",
                        placeholder: "Block Name",
                        value: _name
                    })
                ],
                endButton: new Button({
                    text: "OK",
                    press: async function () {
                        var tag = sap.ui.getCore().byId("inputField").getValue();

                        if(tag === "") {
                            MessageBox.show("Please fill in the tag field");
                            return;
                        }
                        if(/\s/.test(tag)) {
                            MessageBox.show("The tag cannot contain spaces");
                            return;
                        }

                        var oModel = this.getView().getModel("myModel");
                        oModel.read("/reuse", {
                            success: (oData) => {
                                if(oData && oData.results) {
                                    if(oData.results.find((element) => element.tag === "#" + tag)) {
                                        MessageBox.show("Entry already exist");
                                        return;
                                    }
                                    else {
                                        try {
                                            oModel.createEntry("/reuse", {
                                                        properties: {
                                                            document_documentID: this.documentID,
                                                            tag: "#" + tag,
                                                            source: source
                                                        },
                                                        error: (oError) => {
                                                            console.log("Create failed", oError);
                                                            MessageBox.show("Creation failed: " + utility.getResponseErrorText(oError));
                                                        }
                                                    });
                                                } catch (error) {
                                                    MessageBox.show("Creation failed: " + error);
                                                }
                    
                                            oModel.submitChanges({
                                                    success: (oData) => { 
                                                        var oTable = this.getView().byId("reuseTable");
                                                        var aItems = oTable.getItems();
                                                        var index = 0;
                                                        var aContexts = aItems.map(function (oItem) {
                                                            var bContext = oItem.getBindingContext("myModel");
                                                            var match = bContext.sPath.match(/tag='([^']*)'/);
                                                            if (match && match[1] === "#" + tag) {
                                                                oTable.setSelectedItem(oItem);
                                                            }
                                                            index++;
                                                        });
                                                    },
                                                    error: (error) => { 
                                                        console.log("Create failed"); 
                                                        MessageBox.show("Create failed " + error);
                                                    }
                                            });   
                                            oDialog.close();
                                        }
                                }
                                
                                
                            },
                            error: (oError) => {
                                console.log("Read failed", oError);
                            }
                        });

                       

                        oDialog.close();
                    }.bind(this)
                }),
                beginButton: new Button({
                    text: "Cancel",
                    press: function () {
                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
        });

        this.getView().addDependent(oDialog);
        oDialog.open();
        },

        onAddAutomationPress: function () {
            const tag = this.byId("automationTagInput").getValue();
            const url = this.byId("urlInput").getValue();
            const selector = this.byId("selectorInput").getValue();

            if(tag === "" || url === "" || selector === "") {
                MessageBox.show("Please fill in all fields");
                return;
            }

            if(/\s/.test(tag)) {
                MessageBox.show("The tag cannot contain spaces");
                return;
            }
            var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
                '((([a-zA-Z0-9\\-]+\\.)+[a-zA-Z]{2,})|' + // domain name
                '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
                '(\\:\\d+)?(\\/[-a-zA-Z0-9@:%_\\+.~#?&//=]*)?' + // port and path
                '(\\?[;&a-zA-Z0-9@:%_\\+.~#?&//=]*)?' + // query string
                '(\\#[-a-zA-Z0-9@:%_\\+.~#?&//=]*)?$', 'i'); // fragment locator
            if(!pattern.test(url)) {
                MessageBox.show("The URL is unvalid");
                return;
            }

            var oModel = this.getView().getModel("myModel");
            oModel.read("/automations", {
                success: (oData) => {
                    if(oData && oData.results) {
                        if(oData.results.find((element) => element.tag === "$" + tag)) {
                            MessageBox.show("Entry already exist");
                            return;
                        }
                        else {

                            oModel.createEntry("/automations", {
                                        properties: {
                                            document_documentID: this.documentID,
                                            tag: tag,
                                            url: url,
                                            selector: selector
                                        },
                                        error: (oError) => {
                                            console.log("Create failed", oError);
                                            MessageBox.show("Creation failed: " + utility.getResponseErrorText(oError));
                                        }
                                    });

                            oModel.submitChanges({
                                    success: () => { 
                                        console.log("Submitted"); 
                                        this.byId("automationTagInput").setValue("");
                                        this.byId("urlInput").setValue("");
                                        this.byId("selectorInput").setValue("");
                                        this.getView().byId("automationTable").getBinding("items").refresh();
                                    },
                                    error: (error) => { 
                                        console.log("Create failed"); 
                                        MessageBox.show("Create failed " + error);
                                    }
                            }); 
                        }  
                    }
                }
            });
        },

        openCredentialsDialog: function (element) {
            return new Promise((resolve, reject) => {
                var oUsernameInput = new sap.m.Input({
                    liveChange: function (oEvent) {
                        var sText = oEvent.getParameter('value');
                        var parent = oEvent.getSource().getParent();
                        parent.getBeginButton().setEnabled(sText.length > 0);
                    },
                    width: '100%',
                    placeholder: 'Enter username'
                });
        
                var oPasswordInput = new sap.m.Input({
                    type: sap.m.InputType.Password,
                    width: '100%',
                    placeholder: 'Enter password'
                });
        
                var oDialog = new sap.m.Dialog({
                    title: 'Login for ' + element.url,
                    type: 'Message',
                    content: [
                        new sap.m.Label({ text: 'Username', labelFor: oUsernameInput.getId() }),
                        oUsernameInput,
                        new sap.m.Label({ text: 'Password', labelFor: oPasswordInput.getId() }),
                        oPasswordInput
                    ],
                    beginButton: new sap.m.Button({
                        text: 'Login',
                        enabled: false,
                        press: function () {
                            var sUsername = oUsernameInput.getValue();
                            var sPassword = oPasswordInput.getValue();
                            oDialog.close();
                            resolve({ username: sUsername, password: sPassword });
                        }
                    }),
                    endButton: new sap.m.Button({
                        text: 'Cancel',
                        press: function () {
                            oDialog.close();
                            resolve(null);
                        }
                    }),
                    afterClose: function() {
                        oDialog.destroy();
                    }
                });
        
                oDialog.open();
            });
        },
        

        switchChangedScreenshot: async function (oEvent) {
            var oSwitch = oEvent.getSource();
            this.updateSwitchStatus(oSwitch, "isScreenshot");
        },

        switchChangedCredentials: async function (oEvent) {
            var oSwitch = oEvent.getSource();
            this.updateSwitchStatus(oSwitch, "credentialsRequired");
        },

        updateSwitchStatus: async function (oSwitch, property) {
            var oModel = this.getView().getModel("myModel");
            var oContext = oSwitch.getBindingContext("myModel");
            var sPath = oContext.getPath();
            var oData = {};
            oData[property] = oSwitch.getState();
            oModel.update(sPath, oData, {
                success: function () {
                    console.log("Update successful");
                    oModel.refresh();
                },
                error: function () {
                    console.log("Update failed");
                }
            });
        },

        onCopyPress: async function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext("myModel");
            var sPath = oContext.getPath();
            var oModel = this.getView().getModel("myModel");
            
            var tag = oContext.getObject().tag;

            var oTempTextArea = document.createElement("textarea");
            oTempTextArea.value = tag;
            
            // Avoid scrolling to the bottom
            oTempTextArea.style.position = "absolute";
            oTempTextArea.style.left = "-9999px";
            document.body.appendChild(oTempTextArea);
            
            // Select the text
            oTempTextArea.select();
            
            // Copy the text to the clipboard
            try {
                document.execCommand("copy");
                sap.m.MessageToast.show("Copied to clipboard!");
            } catch (err) {
                sap.m.MessageToast.show("Failed to copy!");
            }
        },

        onCopySharedPress: async function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext();
            var sPath = oContext.getPath();
            var oModel = this.getView().getModel("myModel");

            var oTempTextArea = document.createElement("textarea");
            oTempTextArea.value = formatter.concatenateText(oContext.getObject().document_documentID, oContext.getObject().tag)
            
            // Avoid scrolling to the bottom
            oTempTextArea.style.position = "absolute";
            oTempTextArea.style.left = "-9999px";
            document.body.appendChild(oTempTextArea);
            
            // Select the text
            oTempTextArea.select();
            
            // Copy the text to the clipboard
            try {
                document.execCommand("copy");
                sap.m.MessageToast.show("Copied to clipboard!");
            } catch (err) {
                sap.m.MessageToast.show("Failed to copy!");
            }
        },

        onDeletePress: async function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext("myModel");
            var sPath = oContext.getPath();
            var oModel = this.getView().getModel("myModel");
            console.log(sPath);
            oModel.remove(sPath, {
                success: function () {
                    console.log("Deleted");
                    var sharedTable = this.getView().byId("reuseSharedTable");
                    sharedTable.getBinding("items").refresh();
                    oModel.refresh();
                }.bind(this),
                error: function () {
                    console.log("Delete failed");
                }
            });
        },

        onDeleteSharedPress: async function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext();
            var sPath = oContext.getPath();
            var oModel = this.getView().getModel("myModel");
            console.log(oContext.getObject().document_documentID, this.documentID);
            if(oContext.getObject().document_documentID !== this.documentID) {
                MessageToast.show("Only the owner can delete shared blocks!");
                return;
            }
            oModel.update(sPath, {published: false}, {
                success: function () {
                    console.log("Removed from shared library");
                    var sharedTable = this.getView().byId("reuseSharedTable");
                    sharedTable.getBinding("items").refresh();
                }.bind(this),
                error: function () {
                    console.log("Delete failed");
                }
            });
        },

        onDragStartTree: function (oEvent) {
            console.log(oEvent)
            var oDraggedItem = oEvent.getParameter("draggedControl");
            var oContext = oDraggedItem.getBindingContext();
            if(!oContext) return;

            this.draggedItemContext = oContext;
            oEvent.getParameter("dragSession").setComplexData("draggedContext", oContext);
        },

        onDropReuse: function (oEvent) {
            var oDraggedRow = oEvent.getParameter("draggedControl");
            var oDraggedContext = oDraggedRow.getBindingContext("myModel");
            var data = oDraggedContext.getObject();
            this.onAddReusePress({source: data.source, name: data.title});
        },

        reuseLibraryPress: async function (oEvent) {
            var oModel = this.getView().getModel("myModel");
            var source = this.getView().byId("reuseRTE").getValue();
            var oTable = this.getView().byId("reuseTable");
            var sharedTable = this.getView().byId("reuseSharedTable");
            var item = oTable.getSelectedItem();        

            if (!item) {
                MessageToast.show("Select an own block to publish!");
                return;
            }
            
            oModel.setProperty(item.getBindingContext("myModel").getPath() + "/source", source);
            oModel.setProperty(item.getBindingContext("myModel").getPath() + "/published", true);
            oModel.submitChanges({
                success: async () => { 
                    console.log("Submitted"); 
                    MessageToast.show("Published! Go to 'Shared' to see changes.");
                    
                    sharedTable.getBinding("items").refresh();
                },
                error: (error) => {
                    console.log("Submit failed"); 
                }    
            }); 
        }
    });
});