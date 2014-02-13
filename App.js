Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items: [
        {
            xtype: 'container',
            itemId: 'iterationDropDown',
            columnWidth: 1
        },
        {
            xtype: 'container',
            itemId: 'mychart',
            columnWidth: 1
        }
    ],

    planEstimateHash: null,
    myChart: null,

    launch: function() {

        // Grab and use the timebox scope if we have it
        var timeboxScope = this.getContext().getTimeboxScope();
        if(timeboxScope) {
            var record = timeboxScope.getRecord();
            var name = record.get('Name');

            this.myIteration = record.data;
            this._onIterationSelect();

        // Otherwise add an iteration combo box to the page
        } else {
            // add the iteration dropdown selector
            this.down("#iterationDropDown").add( {
                xtype: 'rallyiterationcombobox',
                itemId : 'iterationSelector',
                listeners: {
                    select: this._onIterationSelect,
                    ready:  this._onIterationSelect,
                    scope:  this
                }
            });
        }

    },

    onTimeboxScopeChange: function(newTimeboxScope) {
        this.callParent(arguments);

        if(newTimeboxScope) {
            var record = newTimeboxScope.getRecord();

            this.myIteration = record.data;
            this._onIterationSelect();
        }
    },

    _onIterationSelect : function() {

        if (_.isUndefined( this.getContext().getTimeboxScope())) {
            var value =  this.down('#iterationSelector').getRecord();
            this.myIteration = value.data;
        }

        var iterationId = this.myIteration.ObjectID;

        Ext.create('Rally.data.lookback.SnapshotStore', {
            autoLoad : true,
            limit: Infinity,
            listeners: {
                load: this._processSnapShotData,
                scope : this
            },
            fetch: ['ObjectID','Name', 'Priority','ScheduleState', 'PlanEstimate','TaskEstimateTotal','TaskRemainingTotal'],
            hydrate: ['ScheduleState'],
            filters: [
                {
                    property: '_TypeHierarchy',
                    operator: 'in',
                    value: ['HierarchicalRequirement']
                },
                {
                    property: 'Iteration',
                    operator: 'in',
                    value: iterationId
                },
                {
                    property: '__At',
                    value: 'current'
                }
            ]
        });
    },

    _processSnapShotData : function(store, data, success) {

        var me = this;
        var planEstimateHash = {};
        var records = [];

        Ext.Array.each(data, function(record) {

            var planEstimateKey = record.get('PlanEstimate').toString();
            if (!planEstimateHash[planEstimateKey]) {
                planEstimateHash[planEstimateKey] = 1;
            } else {
                var currentCount = planEstimateHash[planEstimateKey];
                planEstimateHash[planEstimateKey] = currentCount + 1;
            }
        });

        me.planEstimateHash = planEstimateHash;
        me._showChart();
    },

    _sortArrays: function(arr, sortArr) {
        var result = [];
        for(var i=0; i < arr.length; i++) {
            result[i] = arr[sortArr[i]];
        }
        return result;
    },

    _stringArrayToIntArray: function(stringArray) {
        var result = [];
        Ext.Array.each(stringArray, function(thisString) {
            result.push(parseInt(thisString, 10));
        });
        return result;
    },

    _showChart : function() {

        var me = this;

        var chartDiv = this.down("#mychart");
        chartDiv.removeAll();
        if (me.myChart) {
            me.myChart.destroy();
        }

        var planEstCategoryValues;
        var planEstCategoryStrings = [];
        var planEstCategoryStringsWithPoints = [];
        var planEstCounts = [];

        var sortedPlanEstCategoryValues;
        var sortedPlanEstCategoryStrings;
        var sortedPlanEstCounts;


        Object.keys(me.planEstimateHash).forEach(function(key) {
            planEstCategoryStrings.push(key);
            planEstCounts.push(me.planEstimateHash[key]);
        });

        planEstCategoryValues = me._stringArrayToIntArray(planEstCategoryStrings);

        Ext.Array.each(planEstCategoryStrings, function(thisString) {
            var newString;
            if (thisString === "0") {
                newString = "Un-estimated";

            } else {
                newString = thisString + " Points";
            }
            planEstCategoryStringsWithPoints.push(newString);
        });

        me.myChart = Ext.create('Rally.ui.chart.Chart', {
            chartData: {
                categories: planEstCategoryStringsWithPoints,
                series: [
                    {
                        type: 'column',
                        data: planEstCounts,
                        name: 'Stories',
                        color: "##00AC00"
                    }
                ]
            },

            chartConfig: {
                chart: {},
                title: {
                    text: 'PlanEstimate Histogram',
                    align: 'center'
                },
                xAxis: [
                    {
                        categories: planEstCategoryStringsWithPoints,
                        labels: {
                            rotation: -45,
                            align: 'right'
                        }
                    }
                ],
                yAxis: [
                    {
                        title: {
                            enabled: true,
                            text: 'Story Count',
                            style: {
                                fontWeight: 'normal'
                            }
                        }
                    }
                ]
            }
        });

        me.myChart.setChartColors(['#00AC00']);

        chartDiv.add(me.myChart);
        me.myChart._unmask();

    }
});