module.exports = function (app) {

    var dataInjector = app.middleware.dataInjector
    var report = app.controllers.report;


    app.get('/service/report/field/', dataInjector, report.field);
    app.get('/service/report/field/:category/:id/:filename', report.fieldData);
    app.get('/service/report/textreport', report.textreport);

}