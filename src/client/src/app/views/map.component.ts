import {
  Component,
  Inject,
  Injectable,
  OnInit,
  LOCALE_ID,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy
} from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { DatePipe } from "@angular/common";
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogConfig
} from "@angular/material";

import { defaults as defaultInteractions } from 'ol/interaction';

import { Observable } from "rxjs";
import { of } from "rxjs/observable/of";
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  tap,
  switchMap
} from "rxjs/operators";

import BingMaps from "ol/source/BingMaps";
import { unByKey } from "ol/Observable";
import OlObservable from "ol/Observable";
import OlMap from "ol/Map";
import OlXYZ from "ol/source/XYZ";
import OlTileLayer from "ol/layer/Tile";
import TileWMS from "ol/source/TileWMS";
import OlView from "ol/View";
import * as OlProj from "ol/proj";
import TileGrid from "ol/tilegrid/TileGrid";
import * as OlExtent from "ol/extent.js";
import GeoJSON from "ol/format/GeoJSON";
import VectorLayer from "ol/layer/Vector";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import VectorSource from "ol/source/Vector";
import Circle from "ol/style/Circle.js";
import Select from "ol/interaction/Select";
import UTFGrid from "ol/source/UTFGrid.js";
import * as _ol_TileUrlFunction_ from "ol/tileurlfunction.js";
import Overlay from "ol/Overlay.js";
import Fill from "ol/style/Fill.js";
import * as Condition from "ol/events/condition.js";
import { Lightbox } from "ngx-lightbox";
import {
  NgxGalleryOptions,
  NgxGalleryImage,
  NgxGalleryAnimation
} from "ngx-image-video-gallery";


const SEARCH_URL = "/service/map/search";
const PARAMS = new HttpParams({
  fromObject: {
    format: "json"
  }
});

@Injectable()
export class SearchService {
  constructor(private http: HttpClient) { }

  search(term: string) {
    if (term === "") {
      return of([]);
    }

    return this.http
      .get(SEARCH_URL, { params: PARAMS.set("key", term) })
      .pipe(map(response => response));
  }
}

@Component({
  selector: "app-map",
  templateUrl: "./map.component.html",
  providers: [SearchService],
  styleUrls: ["./map.component.css"]
})
export class MapComponent implements OnInit {
  map: OlMap;
  layers: Array<TileWMS>;
  tileGrid: TileGrid;
  projection: OlProj;
  currentZoom: Number;
  regionsLimits: any;
  dataSeries: any;
  dataStates: any;
  dataCities: any;
  chartResultCities: any;
  chartResultCitiesIllegalAPP: any;
  chartResultCitiesIllegalRL: any;
  periodSelected: any;
  desmatInfo: any;

  optionsTimeSeries: any;
  optionsStates: any;
  optionsCities: any;

  changeTabSelected: "";
  viewWidth = 600;
  viewWidthMobile = 350;
  chartRegionScale: boolean;

  textOnDialog: any;
  mapbox: any;
  satelite: any;
  estradas: any;
  relevo: any;
  landsat: any;
  descriptor: any;
  valueRegion: any;
  regionFilterDefault: any;
  urls: any;
  dataExtent: any;

  searching = false;
  searchFailed = false;
  msFilterRegion = "";
  selectRegion: any;

  region_geom: any;
  regionSource: any;
  regionTypeFilter: any;

  defaultRegion: any;

  statePreposition = [];

  layersNames = [];
  layersTypes = [];
  basemapsNames = [];
  limitsNames = [];
  LayersTMS = {};
  limitsTMS = {};

  collapseCharts = false;
  collapseLayer = false;

  isFilteredByCity = false;
  isFilteredByState = false;
  selectedIndex: any;
  collapseLegends = false;

  infodata: any;
  infodataCampo: any;
  infodataMunicipio: any;
  fieldPointsStop: any;
  utfgridsource: UTFGrid;
  utfgridlayer: OlTileLayer;
  utfgridCampo: UTFGrid;
  utfgridlayerCampo: OlTileLayer;
  utfgridmunicipio: UTFGrid;
  utfgridlayerMunicipio: OlTileLayer;
  infoOverlay: Overlay;
  datePipe: DatePipe;

  selectedLanguage: any;
  selectedLanguageItem: any;

  selectedCountryCode: any;
  countryCodes = <any>[];
  customLabels: any;

  dataForDialog = <any>{};

  keyForClick: any;
  keyForPointer: any;
  currentData: any;
  language: any;

  languages: any[];

  titlesLayerBox: any
  minireportText: any
  descriptorText: any

  /** Variables for upload shapdefiles **/
  layerFromUpload: any = {
    label: null,
    layer: null,
    checked: false,
    visible: null,
    loading: false,
    dragArea: true,
    strokeColor: "#2224ba",
  };

  constructor(
    private http: HttpClient,
    private _service: SearchService,
    public dialog: MatDialog
  ) {
    this.projection = OlProj.get("EPSG:900913");
    this.currentZoom = 5.8;
    this.layers = [];

    this.dataSeries = {};
    this.dataStates = {};

    this.chartResultCities = {
      split: []
    };
    this.chartResultCitiesIllegalAPP = {};
    this.chartResultCitiesIllegalRL = {};

    this.defaultRegion = {
      type: "biome",
      text: "Cerrado",
      value: "Cerrado",
      area_region: 2040047.67930316,
      regionTypeBr: "Bioma"
    };
    this.selectRegion = this.defaultRegion;

    this.textOnDialog = {};

    this.currentData = "";
    this.valueRegion = {
      text: ""
    }

    this.urls = [
      'http://o1.lapig.iesa.ufg.br/ows',
      'http://o2.lapig.iesa.ufg.br/ows',
      'http://o3.lapig.iesa.ufg.br/ows',
      'http://o4.lapig.iesa.ufg.br/ows'
      // "http://localhost:5501/ows"
    ];

    this.tileGrid = new TileGrid({
      extent: this.projection.getExtent(),
      resolutions: this.getResolutions(this.projection),
      tileSize: 512
    });

    this.descriptor = {
      groups: []
    };

    this.periodSelected = {
      value: "year=2019",
      Viewvalue: "2018/2019",
      year: 2019
    };

    this.desmatInfo = {
      value: "year=2019",
      Viewvalue: "2018/2019",
      year: 2019
    };
    this.datePipe = new DatePipe("pt-BR");
    this.language = "pt-br";

    this.selectedLanguageItem = { name: 'Brasil', flag: 'br', lang: 'pt-br' }

    this.selectedLanguage = {
      label: "optionLabel",
      value: this.selectedLanguageItem
    }

    this.selectedCountryCode = 'br';
    this.countryCodes = ['br', 'us'];

    this.customLabels = {
      'br': 'Português (Portuguese)',
      'us': 'Inglês (English)'
    };

    this.updateCharts();
    this.chartRegionScale = true;
    this.titlesLayerBox = {};
    this.minireportText = {};

    this.updateTexts();
  }

  changeSelectedCountryCode(value: string): void {

    this.selectedCountryCode = value;

    let lang;
    if (value == 'br') {
      lang = 'pt-br'
    }
    else if (value == 'us') {
      lang = 'en-us'
    }

    this.changeLanguage(lang);
  }

  search = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => (this.searching = true)),
      switchMap(term =>
        this._service.search(term).pipe(
          tap(() => (this.searchFailed = false)),
          catchError(() => {
            this.searchFailed = true;
            return of([]);
          })
        )
      ),
      tap(() => (this.searching = false))
    );

  formatter = (x: { text: string }) => x.text;

  onCityRowSelect(event) {
    let name = event.data.name

    this.http.get(SEARCH_URL, { params: PARAMS.set("key", name) }).subscribe(result => {
      let ob = result[0];

      this.currentData = ob.text
      this.updateRegion(ob)

    });
  }

  private selectedTimeFromLayerType(layerName) {
    for (let layer of this.layersTypes) {
      if (layer.value == layerName) {
        for (let time of layer.times) {
          if (time.value == layer.timeSelected) {
            return time;
          }
        }
      }
    }

    return undefined;
  }

  private getServiceParams() {
    var params = [];

    if (this.selectRegion.type != "") {
      params.push("type=" + this.selectRegion.type);
      params.push("region=" + this.selectRegion.value);
    }

    var selectedTime = this.selectedTimeFromLayerType("bi_ce_prodes_desmatamento_100_fip");

    if (selectedTime != undefined) {
      params.push("year=" + selectedTime.year);
    }

    params.push("lang=" + this.language)

    var urlParams = "?" + params.join("&");


    return urlParams;
  }

  private updateExtent() {
    var extenUrl = "/service/map/extent" + this.getServiceParams();

    if (this.selectRegion.type != "") {
      var map = this.map;
      this.http.get(extenUrl).subscribe(extentResult => {
        var features = new GeoJSON().readFeatures(extentResult, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857"
        });

        this.regionSource = this.regionsLimits.getSource();
        this.regionSource.clear();
        this.regionSource.addFeature(features[0]);

        var extent = features[0].getGeometry().getExtent();
        map.getView().fit(extent, { duration: 1500 });

        this.selectRegion.area_region = extentResult["area_km2"];
      });
    }
  }

  changeTab(event) {
    this.changeTabSelected = event.tab.textLabel;

    if (event.tab.textLabel == "Série Temporal") {
      this.viewWidth = this.viewWidth + 1;
      this.viewWidthMobile = this.viewWidthMobile + 1;
      this.chartRegionScale = true;
    } else if (event.tab.textLabel == "Transições") {
      this.viewWidth = this.viewWidth + 1;
      this.viewWidthMobile = this.viewWidthMobile + 1;
    }
  }

  changeLanguage(lang) {

    var zoom = this.map.getView().getZoom();

    console.log(zoom)
    if (this.language != (lang)) {
      this.language = lang;

      this.updateTexts();
      this.updateCharts();
      this.updateDescriptor();
    }
  }

  private updateTexts() {
    var titlesUrl = "/service/map/titles" + this.getServiceParams();

    this.http.get(titlesUrl).subscribe(titlesResults => {

      this.titlesLayerBox = titlesResults["layer_box"];
      this.titlesLayerBox.legendTitle = titlesResults["legendTitle"];
      this.minireportText = titlesResults["utfgrid"];
      this.descriptorText = titlesResults["descriptor"]

    });

    var textlangurl = "/service/map/textreport?lang=" + this.language;

    this.http.get(textlangurl).subscribe(
      result => {
        this.textOnDialog = result;
      });

  }

  private updateCharts() {
    var timeseriesUrl = "/service/deforestation/timeseries" + this.getServiceParams();
    var statesUrl = "/service/deforestation/states" + this.getServiceParams();
    var citiesUrl = "/service/deforestation/cities" + this.getServiceParams();
    var citiesIllegal = "/service/deforestation/illegal" + this.getServiceParams();

    this.http.get(timeseriesUrl).subscribe(timeseriesResult => {

      this.dataSeries = {
        title: timeseriesResult["title"],
        labels: timeseriesResult["series"].map(element => element.year),
        datasets: [
          {
            label: timeseriesResult["name"],
            data: timeseriesResult["series"].map(element => element.value),
            fill: false,
            borderColor: "#289628"
          }
        ],
        area_antropica: timeseriesResult["indicator"].anthropic,
        description: timeseriesResult["getText"],
        label: timeseriesResult["label"],
        type: timeseriesResult["type"]

      };

      this.optionsTimeSeries = {
        tooltips: {
          callbacks: {
            label: function (tooltipItem, data) {
              var percent = parseFloat(
                data["datasets"][0]["data"][tooltipItem["index"]]
              ).toLocaleString("de-DE");
              return percent + " km²";
            }
          }
        },
        scales: {
          yAxes: [
            {
              ticks: {
                callback: function (value) {
                  return value.toLocaleString("de-DE") + " km²";
                }
              }
            }
          ]
        },
        title: {
          display: false,
          text: "Testing Title",
          fontSize: 16
        },
        legend: {
          position: "bottom"
        }
      };
    });

    if (!this.isFilteredByState) {
      this.http.get(statesUrl).subscribe(statesResult => {
        this.dataStates = {
          labels: statesResult["series"].map(element => element.name),
          datasets: [
            {
              label: statesResult["nameChart"],
              data: statesResult["series"].map(element => element.value),
              fill: true,
              // borderColor: '#333333',
              backgroundColor: "#DAA520"
            }
          ],
          description: statesResult["description"],
          label: statesResult["label"]
        };

        this.optionsStates = {
          tooltips: {
            callbacks: {
              label: function (tooltipItem, data) {
                var percent = parseFloat(
                  data["datasets"][0]["data"][tooltipItem["index"]]
                ).toLocaleString("de-DE");
                return percent + " km²";
              }
            }
          },
          scales: {
            xAxes: [
              {
                ticks: {
                  callback: function (value) {
                    return value.toLocaleString("de-DE") + " km²";
                  }
                }
              }
            ]
          },
          legend: {
            position: "bottom"
          }
        };
      });
    }

    if (!this.isFilteredByCity) {
      this.http.get(citiesUrl).subscribe(citiesResult => {
        this.chartResultCities = citiesResult;

        this.chartResultCities.split = this.chartResultCities.title.split("?")

      });

      if (this.desmatInfo.year >= 2013) {
        this.http.get(citiesIllegal).subscribe(citiesIllegalResult => {
          this.chartResultCitiesIllegalAPP = citiesIllegalResult["resultAPP"];
          this.chartResultCitiesIllegalRL = citiesIllegalResult["resultRL"];

        });
      }
    }

  }

  updateRegion(region) {

    let prodes = this.layersNames.find(element => element.id === "desmatamento_prodes");

    if (region == this.defaultRegion) {
      this.valueRegion = "";
      this.currentData = "";
      this.desmatInfo = {
        value: "year=2019",
        Viewvalue: "2018/2019",
        year: 2019
      };

      prodes.selectedType = "prodes_por_region_fip";

    }
    else {
      prodes.selectedType = "bi_ce_prodes_desmatamento_100_fip";
      this.infodataMunicipio = null;
    }

    this.changeVisibility(prodes, undefined)

    this.selectRegion = region;

    this.isFilteredByCity = false;
    this.isFilteredByState = false;

    if (this.selectRegion.type == "city") {
      this.msFilterRegion = " county = '" + this.selectRegion.value + "'";
      this.isFilteredByCity = true;
      this.isFilteredByState = true;
      this.selectRegion.regionTypeBr = "Município de ";
    } else if (this.selectRegion.type == "state") {
      this.msFilterRegion = "uf = '" + this.selectRegion.value + "'";
      this.isFilteredByState = true;
    }
    else this.msFilterRegion = "";

    this.updateExtent();
    this.updateSourceAllLayer();
  }

  private getResolutions(projection) {
    var projExtent = projection.getExtent();
    var startResolution = OlExtent.getWidth(projExtent) / 256;
    var resolutions = new Array(22);
    for (var i = 0, ii = resolutions.length; i < ii; ++i) {
      resolutions[i] = startResolution / Math.pow(2, i);
    }
    return resolutions;
  }

  openDialog(): void {
    window.document.body.style.cursor = "auto";

    this.dataForDialog.language = this.language;
    this.dataForDialog.textosDaDialog = this.textOnDialog;

    const dialogRef = this.dialog.open(DialogOverviewExampleDialog, {
      width: window.innerWidth - 150 + "px",
      height: window.innerHeight - 50 + "px",
      data: this.dataForDialog,
    });
  }



  private createMap() {
    this.createBaseLayers();
    this.createLayers();

    this.map = new OlMap({
      target: "map",
      layers: this.layers,
      view: new OlView({
        center: OlProj.fromLonLat([-52, -14]),
        projection: this.projection,
        zoom: this.currentZoom
      }),
      loadTilesWhileAnimating: true,
      loadTilesWhileInteracting: true,
      interactions: defaultInteractions({ altShiftDragRotate: false, pinchRotate: false })
    });

    var style = new Style({
      image: new Circle({
        radius: 7,
        fill: new Fill({ color: "#b8714e", width: 1 }),
        stroke: new Stroke({ color: "#7b2900", width: 2 })
      })
    });


    let prodes = this.layersNames.find(element => element.id === "desmatamento_prodes");
    let deter = this.layersNames.find(element => element.id === "desmatamento_deter");

    if (prodes.visible || deter.visible) {

      var selectOver = new Select({
        condition: Condition.pointerMove,
        layers: [this.fieldPointsStop],
        style: style
      });

      this.map.addInteraction(selectOver);

      this.infoOverlay = new Overlay({
        element: document.getElementById("map-info"),
        offset: [15, 15],
        stopEvent: false
      });

      this.keyForPointer = this.map.on(
        "pointermove",
        this.callbackPointerMoveMap.bind(this)
      );

      this.keyForClick = this.map.on(
        "singleclick",
        this.callbackClickMap.bind(this)
      );

      this.map.addOverlay(this.infoOverlay);
    }


  }

  private callbackPointerMoveMap(evt) {

    var utfgridlayerVisible = this.utfgridlayer.getVisible();
    if (!utfgridlayerVisible || evt.dragging) {
      return;
    }

    var utfgridlayerVisibleCampo = this.utfgridlayerCampo.getVisible();
    if (!utfgridlayerVisibleCampo || evt.dragging) {
      return;
    }

    var utfgridlayerVisibleMunicipio = this.utfgridlayerMunicipio.getVisible();
    if (!utfgridlayerVisibleMunicipio || evt.dragging) {
      return;
    }


    let prodes = this.layersNames.find(element => element.id === "desmatamento_prodes");
    let deter = this.layersNames.find(element => element.id === "desmatamento_deter");
    if (prodes.visible || deter.visible) {

      var coordinate = this.map.getEventCoordinate(evt.originalEvent);
      var viewResolution = this.map.getView().getResolution();

      let isCampo = false;
      let isOficial = false;
      let isMunicipio = false;

      if (prodes.selectedType == "bi_ce_prodes_desmatamento_100_fip" || deter.selectedType == "bi_ce_deter_desmatamento_100_fip") {
        isOficial = true;
      }

      if ((prodes.selectedType == "bi_ce_prodes_desmatamento_pontos_campo_fip") ||
        (deter.selectedType == "bi_ce_deter_desmatamento_pontos_campo_fip")) {
        isCampo = true;
      }

      if ((prodes.selectedType == "prodes_por_region_fip")) {
        isMunicipio = true;
      }


      if (isMunicipio) {
        if (this.utfgridmunicipio) {
          this.utfgridmunicipio.forDataAtCoordinateAndResolution(coordinate, viewResolution, function (data) {
            if (data) {

              if (prodes.visible && (prodes.selectedType == "prodes_por_region_fip")) {
                // console.log(this.infodataMunicipio)
                window.document.body.style.cursor = "pointer";
                this.infodataMunicipio = data;
                this.infodataMunicipio.region_display = this.infodataMunicipio.region_display.toUpperCase();

                this.infodataMunicipio.area_app_show = this.infodataMunicipio.area_app == "" ? this.minireportText.undisclosed_message : ("" + (Math.round(this.infodataMunicipio.area_app * 100) / 100) + " km²").replace(".", ",");
                this.infodataMunicipio.area_rl_show = this.infodataMunicipio.area_rl == "" ? this.minireportText.undisclosed_message : ("" + (Math.round(this.infodataMunicipio.area_rl * 100) / 100) + " km²").replace(".", ",");
              }
              else {
                this.infodataMunicipio = null;
              }

              this.infoOverlay.setPosition(data ? coordinate : undefined);

            } else {
              window.document.body.style.cursor = "auto";
              this.infodataMunicipio = null;
            }

          }.bind(this)
          );
        }
      }

      if (isOficial) {

        let openOficial = false

        if ((prodes.selectedType == "bi_ce_prodes_desmatamento_100_fip") || (deter.selectedType == "bi_ce_deter_desmatamento_100_fip")) {

          if (this.utfgridsource) {
            this.utfgridsource.forDataAtCoordinateAndResolution(coordinate, viewResolution, function (data) {
              if (data) {

                isCampo = false;
                data.origin_table = data.origin_table.toUpperCase();
                if (prodes.visible && (prodes.selectedType == "bi_ce_prodes_desmatamento_100_fip")) {
                  if (data.origin_table == "PRODES") {
                    window.document.body.style.cursor = "pointer";
                    this.infodata = data;
                    this.infodata.dataFormatada = this.infodata.data_detec == "" ? this.minireportText.undisclosed_message : this.datePipe.transform(new Date(this.infodata.data_detec), "dd/MM/yyyy");
                    this.infodata.sucept_desmatFormatada = this.infodata.sucept_desmat == null ? this.minireportText.not_computed_message : ("" + (this.infodata.sucept_desmat * 100).toFixed(2) + "%").replace(".", ",");
                    this.infodata.municipio = this.infodata.municipio.toUpperCase();
                    openOficial = true
                  }
                }

                if (!openOficial && deter.visible && (deter.selectedType == "bi_ce_deter_desmatamento_100_fip")) {
                  if (data.origin_table == "DETER") {
                    window.document.body.style.cursor = "pointer";
                    this.infodata = data;
                    this.infodata.dataFormatada = this.infodata.data_detec == "" ? this.minireportText.undisclosed_message : this.datePipe.transform(new Date(this.infodata.data_detec), "dd/MM/yyyy");
                    this.infodata.sucept_desmatFormatada = this.infodata.sucept_desmat == "" ? this.minireportText.not_computed_message : ("" + (this.infodata.sucept_desmat * 100).toFixed(2) + "%").replace(".", ",");
                    this.infodata.municipio = this.infodata.municipio.toUpperCase();
                  }
                }

                this.infoOverlay.setPosition(data ? coordinate : undefined);

              } else {
                window.document.body.style.cursor = "auto";
                this.infodata = null;
              }

            }.bind(this)
            );
          }
        }
      }

      if (isCampo) {
        let openCampo = false
        if ((prodes.selectedType == "bi_ce_prodes_desmatamento_pontos_campo_fip") ||
          (deter.selectedType == "bi_ce_deter_desmatamento_pontos_campo_fip")) {

          if (this.utfgridCampo) {
            coordinate = this.map.getEventCoordinate(evt.originalEvent);
            var viewResolution = this.map.getView().getResolution();

            this.utfgridCampo.forDataAtCoordinateAndResolution(coordinate, viewResolution, function (data) {
              if (data) {

                data.origin_table = data.origin_table.toUpperCase();

                if (prodes.visible && (prodes.selectedType == "bi_ce_prodes_desmatamento_pontos_campo_fip")) {
                  if (data.origin_table == "PRODES") {
                    window.document.body.style.cursor = "pointer";

                    this.infodataCampo = data;
                    this.infodataCampo.dataFormatada = this.infodataCampo.data_detec == "" ? this.minireportText.undisclosed_message : this.datePipe.transform(new Date(this.infodataCampo.data_detec), "dd/MM/yyyy");
                    this.infodataCampo.sucept_desmatFormatada = this.infodataCampo.sucept_desmat == "" ? this.minireportText.not_computed_message : ("" + (this.infodataCampo.sucept_desmat * 100).toFixed(2) + "%").replace(".", ",");
                    this.infodataCampo.origin_table = this.infodataCampo.origin_table.toUpperCase();
                    openCampo = true
                  }
                }
                if (!openCampo && deter.visible && (deter.selectedType == "bi_ce_deter_desmatamento_pontos_campo_fip")) {
                  if (data.origin_table == "DETER") {
                    window.document.body.style.cursor = "pointer";
                    this.infodataCampo = data;
                    this.infodataCampo.dataFormatada = this.infodataCampo.data_detec == "" ? this.minireportText.undisclosed_message : this.datePipe.transform(new Date(this.infodataCampo.data_detec), "dd/MM/yyyy");
                    this.infodataCampo.sucept_desmatFormatada = this.infodataCampo.sucept_desmat == "" ? this.minireportText.not_computed_message : ("" + (this.infodataCampo.sucept_desmat * 100).toFixed(2) + "%").replace(".", ",");
                    this.infodataCampo.origin_table = this.infodataCampo.origin_table.toUpperCase();
                    this.infodataCampo.municipio = this.infodataCampo.municipio.toUpperCase();
                  }
                }

                this.infoOverlay.setPosition(data ? coordinate : undefined);
              } else {
                this.infodataCampo = null;
                window.document.body.style.cursor = "auto";
              }
            }.bind(this)
            );
          }
        }

      }
    }
  }

  private callbackClickMap(evt) {

    var zoom = this.map.getView().getZoom();

    var coordinate = this.map.getEventCoordinate(evt.originalEvent);
    var viewResolution = this.map.getView().getResolution();

    let prodes = this.layersNames.find(element => element.id === "desmatamento_prodes");
    let deter = this.layersNames.find(element => element.id === "desmatamento_deter");


    if (prodes.visible || deter.visible) {

      let isCampo = false;
      let isOficial = false;
      let isMunicipio = false;

      if (prodes.selectedType == "bi_ce_prodes_desmatamento_100_fip" || deter.selectedType == "bi_ce_deter_desmatamento_100_fip") {
        isOficial = true;
      }

      if ((prodes.selectedType == "bi_ce_prodes_desmatamento_pontos_campo_fip") ||
        (deter.selectedType == "bi_ce_deter_desmatamento_pontos_campo_fip")) {
        isCampo = true;
      }

      if ((prodes.selectedType == "prodes_por_region_fip")) {
        isMunicipio = true;
      }

      if (isMunicipio) {
        if (this.utfgridmunicipio) {
          this.utfgridmunicipio.forDataAtCoordinateAndResolution(coordinate, viewResolution, function (data) {

            if (data) {
              //console.log(OlProj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326'))

              if (prodes.visible && (prodes.selectedType == "prodes_por_region_fip")) {

                this.http.get(SEARCH_URL, { params: PARAMS.set("key", data.region_name) }).subscribe(result => {
                  let ob = result[0];

                  this.currentData = ob.text
                  this.updateRegion(ob);

                  let prodes = this.layersNames.find(element => element.id === "desmatamento_prodes");
                  prodes.selectedType = "bi_ce_prodes_desmatamento_100_fip";
                  this.changeVisibility(prodes, undefined)
                  this.infodataMunicipio = null;

                });
              }
            }
          }.bind(this)
          );
        }
      }



      if (isCampo) {

        let open = false
        if (this.utfgridCampo) {
          this.utfgridCampo.forDataAtCoordinateAndResolution(coordinate, viewResolution, function (data) {

            if (data) {
              //console.log(OlProj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326'))

              if (prodes.visible && (prodes.selectedType == "bi_ce_prodes_desmatamento_pontos_campo_fip")) {

                isOficial = false;
                this.dataForDialog = data;
                this.dataForDialog.coordinate = coordinate;
                this.dataForDialog.year = new Date(this.dataForDialog.data_detec).getFullYear();
                this.dataForDialog.datePipe = this.datePipe;
                open = true
                this.openDialog();
              }

              if (!open && deter.visible && (deter.selectedType == "bi_ce_deter_desmatamento_pontos_campo_fip")) {
                isOficial = false;
                this.dataForDialog = data;
                this.dataForDialog.coordinate = coordinate;
                this.dataForDialog.year = new Date(this.dataForDialog.data_detec).getFullYear();
                this.dataForDialog.datePipe = this.datePipe;
                this.openDialog();
              }

            }
          }.bind(this)
          );
        }
      }

      if (isOficial) {

        let openOficial = false
        if (this.utfgridsource) {
          this.utfgridsource.forDataAtCoordinateAndResolution(coordinate, viewResolution, function (data) {
            if (data) {
              //console.log(OlProj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326'))
              if (prodes.visible && (prodes.selectedType == "bi_ce_prodes_desmatamento_100_fip")) {
                this.dataForDialog = data;
                this.dataForDialog.coordinate = coordinate;
                this.dataForDialog.datePipe = this.datePipe;
                this.dataForDialog.year = this.selectedTimeFromLayerType("bi_ce_prodes_desmatamento_100_fip").year;
                openOficial = true
                this.openDialog();
              }

              if (!openOficial && deter.visible && (deter.selectedType == "bi_ce_deter_desmatamento_100_fip")) {
                this.dataForDialog = data;
                this.dataForDialog.coordinate = coordinate;
                this.dataForDialog.datePipe = this.datePipe;
                this.dataForDialog.year = new Date(this.dataForDialog.data_detec).getFullYear();
                this.openDialog();
              }

            }
          }.bind(this)
          );
        }
      }
    }
  }

  private createBaseLayers() {
    this.mapbox = {
      visible: true,
      layer: new OlTileLayer({
        source: new OlXYZ({
          wrapX: false,
          url:
            "https://api.tiles.mapbox.com/v4/mapbox.light/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw"
        }),
        visible: true
      })
    };

    this.satelite = {
      visible: false,
      layer: new OlTileLayer({
        preload: Infinity,
        source: new BingMaps({
          key:
            "VmCqTus7G3OxlDECYJ7O~G3Wj1uu3KG6y-zycuPHKrg~AhbMxjZ7yyYZ78AjwOVIV-5dcP5ou20yZSEVeXxqR2fTED91m_g4zpCobegW4NPY",
          imagerySet: "Aerial"
        }),
        visible: false
      })
    };

    this.estradas = {
      visible: false,
      layer: new OlTileLayer({
        preload: Infinity,
        source: new BingMaps({
          key:
            "VmCqTus7G3OxlDECYJ7O~G3Wj1uu3KG6y-zycuPHKrg~AhbMxjZ7yyYZ78AjwOVIV-5dcP5ou20yZSEVeXxqR2fTED91m_g4zpCobegW4NPY",
          imagerySet: "Road"
        }),
        visible: false
      })
    };

    this.relevo = {
      visible: false,
      layer: new OlTileLayer({
        source: new OlXYZ({
          url:
            "https://server.arcgisonline.com/ArcGIS/rest/services/" +
            "World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}"
        }),
        visible: false
      })
    };

    this.landsat = {
      visible: false,
      layer: new OlTileLayer({
        source: new TileWMS({
          url: "http://mapbiomas-staging.terras.agr.br/wms",
          projection: "EPSG:3857",
          params: {
            LAYERS: "rgb",
            SERVICE: "WMS",
            TILED: true,
            VERSION: "1.1.1",
            TRANSPARENT: "true",
            MAP: "wms/v/staging/classification/rgb.map",
            YEAR: 2017
          },
          serverType: "mapserver",
          tileGrid: this.tileGrid
        }),
        visible: false
      })
    };

    for (let baseName of this.basemapsNames) {
      this.layers.push(this[baseName.value].layer);
    }
  }

  private createLayers() {
    var olLayers: OlTileLayer[] = new Array();

    //layers
    for (let layer of this.layersTypes) {
      this.LayersTMS[layer.value] = this.createTMSLayer(layer);
      this.layers.push(this.LayersTMS[layer.value]);
    }

    //limits
    for (let limits of this.limitsNames) {
      this.limitsTMS[limits.value] = this.createTMSLayer(limits);
      this.layers.push(this.limitsTMS[limits.value]);
    }

    this.regionsLimits = this.createVectorLayer("regions", "#666633", 3);
    this.layers.push(this.regionsLimits);

    this.utfgridsource = new UTFGrid({
      tileJSON: this.getTileJSON()
    });

    this.utfgridlayer = new OlTileLayer({
      source: this.utfgridsource
    });

    this.utfgridCampo = new UTFGrid({
      tileJSON: this.getTileJSONCampo()
    });

    this.utfgridlayerCampo = new OlTileLayer({
      source: this.utfgridCampo
    });

    this.utfgridmunicipio = new UTFGrid({
      tileJSON: this.getTileJSONMunicipio()
    });

    this.utfgridlayerMunicipio = new OlTileLayer({
      source: this.utfgridmunicipio
    });

    this.layers.push(this.utfgridlayer);
    this.layers.push(this.utfgridlayerCampo);
    this.layers.push(this.utfgridlayerMunicipio);

    this.layers = this.layers.concat(olLayers.reverse());
  }

  private getTileJSON() {

    let text = "((origin_table = 'prodes' AND " + this.selectedTimeFromLayerType("bi_ce_prodes_desmatamento_100_fip").value + ")"
      + " OR " + "(origin_table = 'deter' AND " + this.selectedTimeFromLayerType("bi_ce_deter_desmatamento_100_fip").value + "))";

    if (this.selectRegion.type === "city") {
      text += " AND county = '" + this.selectRegion.value + "'";
    } else if (this.selectRegion.type === "state") {
      text += " AND uf = '" + this.selectRegion.value + "'";
    }

    return {
      version: "2.2.0",
      grids: [
        this.returnUTFGRID("bi_ce_info_utfgrid_fip", text, "{x}+{y}+{z}")
      ]
    };

  }

  private getTileJSONCampo() {

    let text = "1=1";

    if (this.selectRegion.type === "city") {
      text += " AND p.county = '" + this.selectRegion.value + "'";
    } else if (this.selectRegion.type === "state") {
      text += " AND p.uf = '" + this.selectRegion.value + "'";
    }

    return {
      version: "2.2.0",
      grids: [
        this.returnUTFGRID("bi_ce_info_utfgrid_pontos_campo_fip", text, "{x}+{y}+{z}")
      ]
    };

  }

  private getTileJSONMunicipio() {

    let text = "1=1";

    let time = this.selectedTimeFromLayerType("prodes_por_region_fip")

    if (this.selectRegion.type === "city" || this.selectRegion.type === "state") {
      text += " AND region_type = '" + this.selectRegion.type + "'";
    }

    text += " AND " + time.value

    return {
      version: "2.2.0",
      grids: [
        this.returnUTFGRID("prodes_por_region_fip", text, "{x}+{y}+{z}")
      ]
    };

  }

  private returnUTFGRID(layername, filter, tile) {
    return "/ows?layers=" + layername + "&MSFILTER=" + filter + "&mode=tile&tile=" + tile + "&tilemode=gmap&map.imagetype=utfgrid"
  }

  private createTMSLayer(layer) {
    return new OlTileLayer({
      source: new OlXYZ({
        urls: this.parseUrls(layer)
      }),
      tileGrid: this.tileGrid,
      visible: layer.visible,
      opacity: layer.opacity
    });
  }

  private createVectorLayer(layerName, strokeColor, width) {
    return new VectorLayer({
      name: layerName,
      source: new VectorSource(),
      style: [
        new Style({
          stroke: new Stroke({
            color: "#dedede",
            width: width + 1
          })
        }),
        new Style({
          stroke: new Stroke({
            color: strokeColor,
            width: width
          })
        })
      ]
    });
  }

  private parseUrls(layer) {
    var result = [];

    var filters = [];

    if (layer.timeHandler == "msfilter" && layer.times)
      filters.push(layer.timeSelected);
    if (layer.layerfilter) filters.push(layer.layerfilter);
    if (this.regionFilterDefault) filters.push(this.regionFilterDefault);
    if (layer.regionFilter && this.msFilterRegion)
      filters.push(this.msFilterRegion);

    var msfilter = "";
    if (filters.length > 0) msfilter += "&MSFILTER=" + filters.join(" AND ");

    var layername = layer.value;
    if (layer.timeHandler == "layername") layername = layer.timeSelected;

    for (let url of this.urls) {
      result.push(url + "?layers=" + layername + msfilter + "&mode=tile&tile={x}+{y}+{z}" + "&tilemode=gmap" + "&map.imagetype=png");
    }
    return result;
  }

  private updateSourceAllLayer() {
    for (let layer of this.layersTypes) {
      this.updateSourceLayer(layer);
    }
  }

  private updateSourceLayer(layer) {
    if (layer["times"]) {
      this.periodSelected = layer["times"].find(
        element => element.value === layer.timeSelected
      );
    }

    // this.layersNames.find(element => element.id === "desmatamento_prodes")

    if (layer["value"] === "bi_ce_prodes_desmatamento_100_fip" || layer["value"] === "prodes_por_region_fip") {
      this.desmatInfo = this.periodSelected;
      this.updateCharts();
    }

    this.handleInteraction();

    var source_layers = this.LayersTMS[layer.value].getSource();
    source_layers.setUrls(this.parseUrls(layer));
    source_layers.refresh();
  }

  baseLayerChecked(base, e) {
    for (let basemap of this.basemapsNames) {
      if (base.value == basemap.value && e.checked) {
        this[base.value].layer.setVisible(true);
        basemap.visible = true;
      } else if (basemap.value != base.value) {
        this[basemap.value].layer.setVisible(false);
        basemap.visible = false;
      } else {
        this[this.descriptor.basemaps[0].defaultBaseMap].layer.setVisible(true);
        if (basemap.value != this.descriptor.basemaps[0].defaultBaseMap) {
          this[basemap.value].layer.setVisible(false);
          this[basemap.value].visible = false;
        }
      }
    }
  }

  groupLayerschecked(layers, e) {
    if (e.checked) {
      this.LayersTMS[layers].setVisible(e.checked);
    } else {
      this.LayersTMS[layers].setVisible(e.checked);
    }
  }

  limitsLayersChecked(layers, e) {
    //limits
    for (let limits of this.limitsNames) {
      if (layers.value == limits.value && e.checked) {
        this.limitsTMS[limits.value].setVisible(true);
        limits.visible = true;
      } else {
        this.limitsTMS[limits.value].setVisible(false);
        limits.visible = false;
      }
    }
  }

  private handleInteraction() {

    let prodes = this.layersNames.find(element => element.id === "desmatamento_prodes");
    let deter = this.layersNames.find(element => element.id === "desmatamento_deter");


    if (prodes.visible || deter.visible) {

      if ((prodes.selectedType == "bi_ce_prodes_desmatamento_100_fip") || (deter.selectedType == "bi_ce_deter_desmatamento_100_fip")) {

        if (this.utfgridsource) {
          var tileJSON = this.getTileJSON();

          this.utfgridsource.tileUrlFunction_ = _ol_TileUrlFunction_.createFromTemplates(tileJSON.grids, this.utfgridsource.tileGrid);
          this.utfgridsource.tileJSON = tileJSON;
          this.utfgridsource.refresh();

          this.utfgridlayer.setVisible(true);
        }
      }

      if ((prodes.selectedType == "bi_ce_prodes_desmatamento_pontos_campo_fip") || (deter.selectedType == "bi_ce_deter_desmatamento_pontos_campo_fip")) {
        if (this.utfgridCampo) {
          var tileJSONCampo = this.getTileJSONCampo();

          this.utfgridCampo.tileUrlFunction_ = _ol_TileUrlFunction_.createFromTemplates(tileJSONCampo.grids, this.utfgridCampo.tileGrid);
          this.utfgridCampo.tileJSON = tileJSONCampo;
          this.utfgridCampo.refresh();

          this.utfgridlayerCampo.setVisible(true);
        }

      }

      if ((prodes.selectedType == "prodes_por_region_fip")) {
        if (this.utfgridmunicipio) {
          var tileJSONMunicipio = this.getTileJSONMunicipio();

          this.utfgridmunicipio.tileUrlFunction_ = _ol_TileUrlFunction_.createFromTemplates(tileJSONMunicipio.grids, this.utfgridmunicipio.tileGrid);
          this.utfgridmunicipio.tileJSON = tileJSONMunicipio;
          this.utfgridmunicipio.refresh();

          this.utfgridlayerMunicipio.setVisible(true);
        }
      }

    }
    else if (this.utfgridsource && this.utfgridCampo && this.utfgridmunicipio) {
      this.utfgridlayer.setVisible(false);
      this.utfgridlayerCampo.setVisible(false);
      this.utfgridlayerMunicipio.setVisible(false);
    }


  }

  changeVisibility(layer, e) {

    for (let layerType of layer.types) {
      this.LayersTMS[layerType.value].setVisible(false);
    }

    if (e != undefined) {
      layer.visible = e.checked;
    }

    this.LayersTMS[layer.selectedType].setVisible(layer.visible);

    this.handleInteraction();

  }

  private updateDescriptor() {

    this.descriptor.type = this.descriptorText.type_of_information_label[this.language];

    // console.log("descriptor text - ", this.descriptorText)

    for (let group of this.descriptor.groups) {

      group.label = this.descriptorText[group.id].label[this.language];

      for (let layer of group.layers) {
        // console.log("Layer - ", layer)
        layer.label = this.descriptorText[group.id].layers[layer.id].label[this.language]

        for (let layerType of layer.types) {

          if (this.descriptorText[group.id].layers[layer.id].hasOwnProperty("types")) {

            if (this.descriptorText[group.id].layers[layer.id].types[layerType.value].hasOwnProperty("view_value")) {
              layerType.Viewvalue = this.descriptorText[group.id].layers[layer.id].types[layerType.value].view_value[this.language]
            }
            if (this.descriptorText[group.id].layers[layer.id].types[layerType.value].hasOwnProperty("timelabel")) {
              layerType.timeLabel = this.descriptorText[group.id].layers[layer.id].types[layerType.value].timelabel[this.language]
            }

            if (layerType.times) {
              for (let time of layerType.times) {

                if (this.descriptorText[group.id].layers[layer.id].types[layerType.value].hasOwnProperty("times[time.value]"))
                  time.Viewvalue = this.descriptorText[group.id].layers[layer.id].types[layerType.value].times[time.value][this.language]
              }
            }
          }
        }
      }
    }

    for (let basemap of this.descriptor.basemaps) {
      for (let types of basemap.types) {
        types.viewValue = this.descriptorText.basemaps.types[types.value][this.language]
      }
    }

    for (let limits of this.descriptor.limits) {
      for (let types of limits.types) {
        types.Viewvalue = this.descriptorText.limits.types[types.value][this.language]
      }
    }




  }

  public onFileComplete(data: any) {

    let map = this.map;

    this.layerFromUpload.checked = false;


    if (this.layerFromUpload.layer != null) {
      map.removeLayer(this.layerFromUpload.layer);
    }

    if (data.features.length > 1) {
      this.layerFromUpload.loading = false;

      this.layerFromUpload.visible = false;
      this.layerFromUpload.label = data.name;
      this.layerFromUpload.layer = data;

    } else {
      this.layerFromUpload.loading = false;

      if (data.features[0].hasOwnProperty('properties')) {

        let auxlabel = Object.keys(data.features[0].properties)[0];
        this.layerFromUpload.visible = false;
        this.layerFromUpload.label = data.features[0].properties[auxlabel];
        this.layerFromUpload.layer = data;

      } else {

        this.layerFromUpload.visible = false;
        this.layerFromUpload.label = data.name;
        this.layerFromUpload.layer = data;
      }
    }

    this.layerFromUpload.visible = true;

    var vectorSource = new VectorSource({
      features: (new GeoJSON()).readFeatures(data, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857"
      })
    });


    this.layerFromUpload.layer = new VectorLayer({
      source: vectorSource,
      style: [
        new Style({
          stroke: new Stroke({
            color: this.layerFromUpload.strokeColor,
            width: 4
          })
        }),
        new Style({
          stroke: new Stroke({
            color: this.layerFromUpload.strokeColor,
            width: 4,
            lineCap: 'round',
            zIndex: 1
          })
        })
      ]
    });

  }

  onChangeCheckUpload(event) {
    let map = this.map;
    this.layerFromUpload.checked = !this.layerFromUpload.checked;

    if (this.layerFromUpload.checked) {

      map.addLayer(this.layerFromUpload.layer);
      let extent = this.layerFromUpload.layer.getSource().getExtent();
      map.getView().fit(extent, { duration: 1800 });

      let prodes = this.layersNames.find(element => element.id === "desmatamento_prodes");
      prodes.selectedType = "bi_ce_prodes_desmatamento_100_fip";
      this.changeVisibility(prodes, undefined)
      this.infodataMunicipio = null;

    } else {
      map.removeLayer(this.layerFromUpload.layer);
    }

  }

  private getMetadata(metadata, language){
    let _metadata = [];

    metadata.forEach(function (data) {
      _metadata.push({'title': data.title[language], 'description': data.description[language]});
    });

    return _metadata;
  };

ngOnInit() {

    let descriptorURL = "/service/map/descriptor" + this.getServiceParams();

    this.http.get(descriptorURL).subscribe(result => {
      this.descriptor = result;
      this.regionFilterDefault = this.descriptor.regionFilterDefault;


      for (let group of this.descriptor.groups) {
        for (let layer of group.layers) {
          if (layer.id != "satelite") {
            for (let type of layer.types) {
              type.urlLegend = this.urls[0] + "?TRANSPARENT=TRUE&VERSION=1.1.1&SERVICE=WMS&REQUEST=GetLegendGraphic&layer=" + type.value + "&format=image/png";
            }
            this.layersNames.push(layer);
          }

          for (let layerType of layer.types) {
            layerType.visible = false;
            if (layer.selectedType == layerType.value)
              layerType.visible = layer.visible;

            this.layersTypes.push(layerType);
            this.layersTypes.sort(function (e1, e2) {
              return e2.order - e1.order;
            });
          }
        }
      }

      for (let basemap of this.descriptor.basemaps) {
        for (let types of basemap.types) {
          this.basemapsNames.push(types);
        }
      }

      for (let limits of this.descriptor.limits) {
        for (let types of limits.types) {
          this.limitsNames.push(types);
        }
      }
      this.createMap();
    });


  }
}

@Component({
  selector: "app-map",
  templateUrl: "./dialog-laudo.html",
  styleUrls: ["./map.component.css"]
})
export class DialogOverviewExampleDialog implements OnInit, OnDestroy {
  indexAccordion: number = 0;

  images: any[];
  defaultImg = "";
  urlSentinel: Array<{ src: string; caption: string; thumb: string }> = [];
  vetBfast: Array<{ src: string; caption: string; thumb: string }> = [];
  vetSuscept: Array<{ src: string; caption: string; thumb: string }> = [];
  vetCar: Array<{ src: string; caption: string; thumb: string }> = [];
  dataBfast: any = {};
  dataSuscept: any = {};
  dataCampo: any = [];

  infoDesmat: any = {};
  infoVisita: any = {};
  urlsLandSat: any = [];
  dadosValidacao_Amostral: any = {};
  tmpModis: any = [];

  dataTimeseriesModis: any = {};
  optionsTimeSeries: any = {};

  textOnDialog = <any>{};

  carData: any = [];

  albumLandsat: Array<{ src: string; caption: string; thumb: string }> = [];

  galleryOptions: NgxGalleryOptions[];
  galleryDrones: NgxGalleryImage[];
  galleryCamera: NgxGalleryImage[];
  galleryVideos: NgxGalleryImage[];


  constructor(
    public dialogRef: MatDialogRef<DialogOverviewExampleDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef,
    private _lightbox: Lightbox
  ) {
    this.defaultImg = "";
    this.dataSuscept = {};
    this.dataBfast = {};
    this.urlsLandSat = [];
    this.dataCampo = [];
    this.infoDesmat = {};
    this.infoVisita = {};
    this.dadosValidacao_Amostral = {};
    this.dataTimeseriesModis = {};
    this.textOnDialog = data.textosDaDialog;
    this.tmpModis = [];



    this.initGallery();
  }


  initGallery() {
    this.galleryDrones = [];
    this.galleryCamera = [];
    this.galleryVideos = [];
  }

  onNoClick(): void {
    this.cdRef.detach();
    this.dialogRef.close();
  }

  private getServiceParams() {
    let params = [];

    if (this.data != undefined) {
      params.push("origin=" + this.data.origin_table.toLowerCase());
      params.push("gid=" + this.data.gid);

      if (this.data.origin_table.toLowerCase() === "prodes")
        params.push("year=" + this.data.year);
      else {
        params.push("year=2018");
      }

      params.push("lang=" + this.data.language)

    }

    var urlParams = "?" + params.join("&");

    return urlParams;
  }

  ngOnInit() {

    var fieldPhotosUrl = "/service/map/field/" + this.getServiceParams();

    this.http.get(fieldPhotosUrl).subscribe(
      result => {

        this.infoDesmat = result["info"];


        if (this.infoDesmat.classefip == null) {
          this.infoDesmat.pathclassefip = "1";
        }
        else {
          this.infoDesmat.pathclassefip = "/assets/metric/classe" + this.infoDesmat.classefip + ".png"
        }

        this.carData = result["car"];
        this.carData.show = result["car"].show

        this.carData.forEach(element => {

          element.metaData.dataRefFormatada = element.metaData.dataRef == "" ? this.textOnDialog.car_tab.undisclosed_message_car : this.data.datePipe.transform(new Date(element.metaData.dataRef), "dd/MM/yyyy");
          //element.metaData.area_car = element.metaData.area_car / 100.0  //converte HA to Km2
          element.metaData.percentDesmat = "" + (((element.metaData.area_desmatada / element.metaData.area_car) * 100).toFixed(2) + "%").replace(".", ",")
          element.metaData.percentRL = "" + (((element.metaData.area_desmat_rl / element.metaData.area_reserva_legal_total) * 100).toFixed(2) + "%").replace(".", ",")
          element.metaData.percentAPP = "" + (((element.metaData.area_desmat_app / element.metaData.area_app_total) * 100).toFixed(2) + "%").replace(".", ",")

          this.textOnDialog.car_tab.display_rl_message = this.textOnDialog.car_tab.rl_car_label.split("?")
          this.textOnDialog.car_tab.display_app_message = this.textOnDialog.car_tab.app_car_label.split("?")
          this.textOnDialog.car_tab.display_car_description_message = this.textOnDialog.car_tab.deforestation_car_description.split("?")
          // this.textOnDialog.car_tab.display_rl_message = temp[0] + element.metaData.area_desmat_rl + temp[1] + element.metaData.percentRL + temp[2]

          const dcar = {
            src: element.imgsCar.src,
            caption: "CAR: " + element.metaData.cod_car,
            thumb: element.imgsCar.thumb
          };
          this.vetCar.push(dcar);

        });

        const sent = {
          src: result["images"].urlSentinel.src,
          caption: "LandSat " + this.data.year,
          thumb: result["images"].urlSentinel.thumb
        };
        this.urlSentinel.push(sent);

        this.dataCampo = result["ponto_campo"];

        this.urlsLandSat = result["images"].urlsLandSat;

        for (let i = 0; i < this.urlsLandSat.urlsLandsatMontadas.length; i++) {
          const album = {
            src: this.urlsLandSat.urlsLandsatMontadas[i].url,
            caption: this.textOnDialog.historico_amostral_landsat.caption + this.urlsLandSat.urlsLandsatMontadas[i].year,
            thumb: this.urlsLandSat.urlsLandsatMontadas[i].thumb
          };

          this.albumLandsat.push(album);
        }

        this.dadosValidacao_Amostral = result["images"].urlsLandSat.dadosAmostrais

        this.dataBfast = result["images"].urlBfast;
        this.dataBfast.prob_Formatada = this.dataBfast.pct_bfast == null ? this.textOnDialog.analise_automatica.not_computed : ("" + this.dataBfast.pct_bfast.toFixed(2) + "%").replace(".", ",");

        const dfast = {
          src: this.dataBfast.urlBfast.src,
          caption: this.dataBfast.prob_Formatada + this.textOnDialog.analise_automatica.caption_bfast,
          thumb: this.dataBfast.urlBfast.thumb
        };
        this.vetBfast.push(dfast);

        this.dataSuscept = result["images"].suscept;

        this.textOnDialog.analise_automatica.info_susceptibility_description_split = this.textOnDialog.analise_automatica.info_susceptibility_description.split("?");
        this.dataSuscept.sucept_desmatFormatada = this.dataSuscept.prob_suscept == null ? this.textOnDialog.analise_automatica.not_computed : ("" + (this.dataSuscept.prob_suscept * 100).toFixed(2) + "%").replace(".", ",");
        const dsuscept = {
          src: this.dataSuscept.urlSuscept.src,
          caption: this.textOnDialog.analise_automatica.caption_suscept + this.dataSuscept.sucept_desmatFormatada,
          thumb: this.dataSuscept.urlSuscept.thumb
        };
        this.vetSuscept.push(dsuscept);
      },
      err => {
        console.log("Error: ", err);
      },
      () => {
        // <---- chamada ao finalizar o subscribe.
        this.galleryOptions = [
          {
            width: "100%",
            height: "500px",
            thumbnailsColumns: 4,
            imageAnimation: NgxGalleryAnimation.Slide,
            imageDescription: true,
            previewCloseOnClick: true,
            previewCloseOnEsc: true,
            thumbnailsMoveSize: 4
            // thumbnailsRemainingCount: true
          },
          // max-width 800
          {
            breakpoint: 800,
            width: "100%",
            height: "700px",
            imagePercent: 100,
            thumbnailsPercent: 20,
            thumbnailsMargin: 20,
            thumbnailMargin: 20
          },
          {
            breakpoint: 400,
            preview: false
          }
        ];

        for (let index = 0; index < this.dataCampo.length; index++) {
          const element = this.dataCampo[index];

          this.infoVisita = element;

          this.infoVisita.dataFormatada = this.infoVisita.data_visita == "" ? this.textOnDialog.campo_tab.caption_undisclosed : this.infoVisita.data_visita;


          for (let foto = 0; foto < element.fotos_camera.length; foto++) {
            this.galleryCamera.push({
              small: '/service/map/field/fotos_camera/' + element.campo_id + '/' + element.fotos_camera[foto],
              medium: '/service/map/field/fotos_camera/' + element.campo_id + '/' + element.fotos_camera[foto],
              big: '/service/map/field/fotos_camera/' + element.campo_id + '/' + element.fotos_camera[foto],
            });
          }


          for (let foto = 0; foto < element.fotos_drone.length; foto++) {
            this.galleryDrones.push({
              small: '/service/map/field/fotos_drone/' + element.campo_id + '/' + element.fotos_drone[foto],
              medium: '/service/map/field/fotos_drone/' + element.campo_id + '/' + element.fotos_drone[foto],
              big: '/service/map/field/fotos_drone/' + element.campo_id + '/' + element.fotos_drone[foto]
            });
          }

          for (let video = 0; video < element.videos_drone.length; video++) {
            this.galleryVideos.push({
              small: '/service/map/field/videos_drone/' + element.campo_id + '/' + element.videos_drone[video],
              medium: '/service/map/field/videos_drone/' + element.campo_id + '/' + element.videos_drone[video],
              big: '/service/map/field/videos_drone/' + element.campo_id + '/' + element.videos_drone[video]
            });
          }
        }
      }
    );

    var ndvi_time_series = "/service/deforestation/modis?table=" + this.data.origin_table + "&gid=" + this.data.gid;
    this.http.get(ndvi_time_series).subscribe(
      result => {

        this.tmpModis = result;

      },
      err => {
        console.log("Error: ", err);
      },
      () => {
        // <---- chamada ao finalizar o subscribe.

        //TODO API- Grafico

        this.dataTimeseriesModis = {
          labels: this.tmpModis.map(element => element.date),
          datasets: [
            {
              label: "NDVI",
              data: this.tmpModis.map(element => element.ndvi_original.toFixed(4)),
              fill: false,
              borderColor: "#ff0003",
              pointRadius: 1,
              pointHoverRadius: 3
            },
            {
              label: "NDVI-Wiener",
              data: this.tmpModis.map(element => element.ndvi_wiener.toFixed(4)),
              fill: false,
              borderColor: "#208f0a",
              hidden: true,
              pointRadius: 1,
              pointHoverRadius: 3
            },
            {
              label: "NDVI-Savitzky Golay",
              data: this.tmpModis.map(element => element.ndvi_golay.toFixed(4)),
              fill: false,
              borderColor: "#0007db",
              hidden: true,
              pointRadius: 1,
              pointHoverRadius: 3
            }
          ],
          type: "line"

        };

        this.optionsTimeSeries = {
          tooltips: {
            mode: 'index',
            intersect: true,
          },
          maintainAspectRatio: false,
          resposive: true,
          radius: 1,
          scales: {
            yAxes: [{
              ticks: {
                autoSkip: true,
                stepSize: 0.2
              }
            }],
            xAxes: [{
              type: 'time',
              ticks: {
                autoSkip: true
              }
            }]
          },
          title: {
            display: false,
            text: "Testing Title",
            fontSize: 16
          },
          legend: {
            position: "bottom"
          },
          options: {
            elements: {
              point: {
                radius: 0
              }
            }
          }
        };



      }
    );
  }

  ngOnDestroy() {
    this.cdRef.detach(); // do this
  }

  ngAfterViewInit() {
    this.cdRef.detectChanges();
  }

  openImage(index: number): void {
    this._lightbox.open(this.albumLandsat, index);
  }

  closeImage(): void {
    this._lightbox.close();
  }

  openLightboxSentinel(): void {
    this._lightbox.open(this.urlSentinel);
  }

  openLightboxSuscept(): void {
    this._lightbox.open(this.vetSuscept);
  }

  openLightboxBfast(): void {
    this._lightbox.open(this.vetBfast);
  }
  openLightboxCAR(index: number): void {
    this._lightbox.open(this.vetCar, index);
  }
}
