import { DatePipe, DecimalPipe} from '@angular/common';
import { HttpClient, HttpParams, HttpHeaders} from '@angular/common/http';
import { ChangeDetectorRef, Component, HostListener, Inject, Injectable, OnDestroy, OnInit, ElementRef, ViewChild} from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { NgxGalleryAnimation, NgxGalleryImage, NgxGalleryOptions } from 'ngx-image-video-gallery';
import { Lightbox } from 'ngx-lightbox';
import * as OlExtent from 'ol/extent.js';
import GeoJSON from 'ol/format/GeoJSON';
import { defaults as defaultInteractions } from 'ol/interaction';
import OlTileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OlMap from 'ol/Map';
import Overlay from 'ol/Overlay.js';
import * as OlProj from 'ol/proj';
import BingMaps from 'ol/source/BingMaps';
import TileWMS from 'ol/source/TileWMS';
import UTFGrid from 'ol/source/UTFGrid.js';
import VectorSource from 'ol/source/Vector';
import OlXYZ from 'ol/source/XYZ';
import Circle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import TileGrid from 'ol/tilegrid/TileGrid';
import * as _ol_TileUrlFunction_ from 'ol/tileurlfunction.js';
import OlView from 'ol/View';
import { Observable } from 'rxjs';
import { of } from 'rxjs/observable/of';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import { MetadataComponent } from './metadata/metadata.component';
import { Router, ActivatedRoute } from '@angular/router';
import { saveAs } from 'file-saver';
import { GoogleAnalyticsService } from '../services/google-analytics.service';
import * as jsPDF from 'jspdf';
import logos from './logos';
import * as moment from 'moment';
import * as Chart from 'chart.js'

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.pdfMake.vfs;

declare let html2canvas: any;

let SEARCH_URL = '/service/map/search';
let PARAMS = new HttpParams({
  fromObject: {
    format: 'json'
  }
});

@Injectable()
export class SearchService {
  constructor(private http: HttpClient) { }

  search(term: string) {
    if (term === '') {
      return of([]);
    }

    return this.http
      .get(SEARCH_URL, { params: PARAMS.set('key', term) })
      .pipe(map(response => response));
  }
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  providers: [SearchService],
  styleUrls: ['./map.component.css']
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
  chartUsoSolo = [] as any;
  periodSelected: any;
  desmatInfo: any;

  optionsTimeSeries: any;
  optionsStates: any;
  optionsCities: any;

  changeTabSelected = "";
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
  msFilterRegion = '';
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
  utfgridabc: UTFGrid;
  utfgridlayerabc: OlTileLayer;
  infoOverlay: Overlay;
  datePipe: DatePipe;
  dataForDialog = {} as any;

  keyForClick: any;
  keyForPointer: any;
  currentData: any;
  language: any;

  titlesLayerBox: any;
  minireportText: any;
  descriptorText: any;

  bntStylePOR: any;
  bntStyleENG: any;

  styleSelected: any;
  styleDefault: any;

  /** Variables for upload shapdefiles **/
  layerFromUpload: any = {
    label: null,
    layer: null,
    checked: false,
    visible: null,
    loading: false,
    dragArea: true,
    strokeColor: '#2224ba',
  };

  innerHeigth: any;
  showDrawer:boolean;
  controls:any;
  showStatistics: boolean;
  loadingSHP: boolean;
  loadingCSV: boolean;

  constructor(
    private http: HttpClient,
    private _service: SearchService,
    public dialog: MatDialog,
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer,
    public googleAnalyticsService: GoogleAnalyticsService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.projection = OlProj.get('EPSG:900913');
    this.currentZoom = 5.3;
    this.layers = [];

    this.dataSeries = {};
    this.dataStates = {};

    this.chartResultCities = {
      split: []
    };
    this.chartResultCitiesIllegalAPP = {};
    this.chartResultCitiesIllegalRL = {};
    this.chartUsoSolo = [];

    this.defaultRegion = {
      type: 'biome',
      text: 'Cerrado',
      value: 'Cerrado',
      area_region: 2040047.67930316,
      regionTypeBr: 'Bioma'
    };
    this.selectRegion = this.defaultRegion;

    this.textOnDialog = {};

    this.currentData = '';
    this.valueRegion = {
      text: ''
    };

    this.changeTabSelected = "";

    this.urls = [
      'https://o1.lapig.iesa.ufg.br/ows',
      'https://o2.lapig.iesa.ufg.br/ows',
      'https://o3.lapig.iesa.ufg.br/ows',
      'https://o4.lapig.iesa.ufg.br/ows'
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
      value: 'year=2019',
      Viewvalue: '2018/2019',
      year: 2019
    };

    this.desmatInfo = {
      value: 'year=2019',
      Viewvalue: '2018/2019',
      year: 2019
    };
    this.datePipe = new DatePipe('pt-BR');
    this.language = 'pt-br';

    this.styleSelected = {
      'background-color': '#fe8321'
    };

    this.styleDefault = {
      'background-color': '#707070'
    };

    this.bntStyleENG = this.styleDefault;
    this.bntStylePOR = this.styleSelected;

    this.updateCharts();
    this.chartRegionScale = true;
    this.titlesLayerBox = {};
    this.minireportText = {};

    this.updateTexts();

    this.showDrawer     = false;
    this.showStatistics = true;
    this.controls       = {};
    this.updateControls();
    this.loadingSHP = false;
    this.loadingCSV = false;

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
    )

  formatter = (x: { text: string }) => x.text;

  onCityRowSelect(event) {
    let name = event.data.name;

    this.http.get(SEARCH_URL, { params: PARAMS.set('key', name) }).subscribe(result => {
      let ob = result[0];

      this.currentData = ob.text;
      this.updateRegion(ob);

    });
  }

  private selectedTimeFromLayerType(layerName) {
    for (let layer of this.layersTypes) {
      if (layer.value == layerName) {
        if(layer.hasOwnProperty('times')){
          for (let time of layer.times) {
            if (time.value == layer.timeSelected) {
              return time;
            }
          }
        }

      }
    }

    return undefined;
  }

  private getServiceParams() {
    let params = [];

    if (this.selectRegion.type != '') {
      params.push('type=' + this.selectRegion.type);
      params.push('region=' + this.selectRegion.value);
    }

    let selectedTime = this.selectedTimeFromLayerType('bi_ce_prodes_desmatamento_100_fip');

    if (selectedTime != undefined) {
      params.push('year=' + selectedTime.year);
    }

    params.push('lang=' + this.language);

    let urlParams = '?' + params.join('&');


    return urlParams;
  }

  private updateExtent() {
    let extenUrl = '/service/map/extent' + this.getServiceParams();

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

    if (event.tab.textLabel == "Série Temporal" || event.tab.textLabel == "Timeseries") {
      this.viewWidth = this.viewWidth + 1;
      this.viewWidthMobile = this.viewWidthMobile + 1;
      this.chartRegionScale = true;

      let uso_terra = this.layersNames.find(element => element.id === 'terraclass');
      uso_terra.visible = false;

      this.changeVisibility(uso_terra, undefined)

    } else if (event.tab.textLabel == "Uso do Solo" || event.tab.textLabel == "Land Use and Land Cover") {
      this.viewWidth = this.viewWidth + 1;
      this.viewWidthMobile = this.viewWidthMobile + 1;
      this.changeSelectedLulcChart({ index: 0 });
    }
    // this.googleAnalyticsService.eventEmitter("changeTab", "charts", this.changeTabSelected);
  }

  changeLanguage(lang) {

    let zoom = this.map.getView().getZoom();

    if (this.language != (lang)) {
      this.language = lang;


      this.setStylesLangButton();
      this.updateTexts();
      this.updateCharts();
      this.updateDescriptor();
      this.updateControls();
    }
  }


  private setStylesLangButton() {

    if (this.language == 'pt-br') {
      this.bntStyleENG = this.styleDefault;
      this.bntStylePOR = this.styleSelected;
    }
    else {
      this.bntStyleENG = this.styleSelected;
      this.bntStylePOR = this.styleDefault;
    }

  }

  private updateTexts() {
    let titlesUrl = '/service/map/titles' + this.getServiceParams();

    this.http.get(titlesUrl).subscribe(titlesResults => {

      this.titlesLayerBox = titlesResults['layer_box'];
      this.titlesLayerBox.legendTitle = titlesResults['legendTitle'];
      this.minireportText = titlesResults['utfgrid'];
      this.descriptorText = titlesResults['descriptor'];

    });

    let textlangurl = '/service/report/textreport?lang=' + this.language;

    this.http.get(textlangurl).subscribe(
      result => {
        this.textOnDialog = result;
      });

  }

  private updateControls() {
    let extenUrl = '/service/map/controls' + this.getServiceParams();
    this.http.get(extenUrl).subscribe(result => {
     this.controls = result;
    });
  }

  private updateCharts() {
    let timeseriesUrl = '/service/deforestation/timeseries' + this.getServiceParams();
    let statesUrl = '/service/deforestation/states' + this.getServiceParams();
    let citiesUrl = '/service/deforestation/cities' + this.getServiceParams();
    let citiesIllegal = '/service/deforestation/illegal' + this.getServiceParams();
    let urlUsoSolo = '/service/deforestation/indicators' + this.getServiceParams();

    this.http.get(timeseriesUrl).subscribe(timeseriesResult => {

      this.dataSeries = {
        title: timeseriesResult['title'],
        labels: timeseriesResult['series'].map(element => element.year),
        datasets: [
          {
            label: timeseriesResult['name'],
            data: timeseriesResult['series'].map(element => element.value),
            fill: false,
            borderColor: '#289628',
            backgroundColor: '#289628'
          }
        ],
        area_antropica: timeseriesResult['indicator'].anthropic,
        description: timeseriesResult['getText'],
        label: timeseriesResult['label'],
        type: timeseriesResult['type'],
        pointStyle: 'rect'

      };

      this.optionsTimeSeries = {
        tooltips: {
          callbacks: {
            label(tooltipItem, data) {
              let percent = parseFloat(
                data['datasets'][0]['data'][tooltipItem['index']]
              ).toLocaleString('de-DE');
              return percent + ' km²';
            }
          }
        },
        scales: {
          yAxes: [
            {
              ticks: {
                callback(value) {
                  return value.toLocaleString('de-DE') + ' km²';
                }
              }
            }
          ]
        },
        title: {
          display: false,
          fontSize: 14
        },
        legend: {
          labels: {
            usePointStyle: true,
            fontSize: 14
          },
          onHover(event) {
            event.target.style.cursor = 'pointer';
          },
          onLeave(event) {
            event.target.style.cursor = 'default';
          },
          position: 'bottom'
        }
      };
    });

    if (!this.isFilteredByState) {
      this.http.get(statesUrl).subscribe(statesResult => {
        this.dataStates = {
          labels: statesResult['series'].map(element => element.name),
          datasets: [
            {
              label: statesResult['nameChart'],
              data: statesResult['series'].map(element => element.value),
              fill: true,
              // borderColor: '#333333',
              backgroundColor: '#DAA520'
            }
          ],
          description: statesResult['description'],
          label: statesResult['label'],
          pointStyle: 'rect'
        };

        this.optionsStates = {
          tooltips: {
            callbacks: {
              label(tooltipItem, data) {
                let percent = parseFloat(
                  data['datasets'][0]['data'][tooltipItem['index']]
                ).toLocaleString('de-DE');
                return percent + ' km²';
              }
            }
          },
          scales: {
            xAxes: [
              {
                ticks: {
                  callback(value) {
                    return value.toLocaleString('de-DE') + ' km²';
                  }
                }
              }
            ]
          },
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              fontSize: 16
            },
            onHover(event) {
              event.target.style.cursor = 'pointer';
            },
            onLeave(event) {
              event.target.style.cursor = 'default';
            }
          }
        };
      });
    }

    if (!this.isFilteredByCity) {
      this.http.get(citiesUrl).subscribe(citiesResult => {
        this.chartResultCities = citiesResult;

        this.chartResultCities.split = this.chartResultCities.title.split('?');

      });

      if (this.desmatInfo.year >= 2013) {
        this.http.get(citiesIllegal).subscribe(citiesIllegalResult => {
          this.chartResultCitiesIllegalAPP = citiesIllegalResult['resultAPP'];
          this.chartResultCitiesIllegalRL = citiesIllegalResult['resultRL'];

        });
      }
    } else {
      /* Atualiza indicadores de uso do Solo */

      this.http.get(urlUsoSolo).subscribe(usosoloResult => {

        this.chartUsoSolo = usosoloResult;

        for (let graphic of this.chartUsoSolo) {

          graphic.data = {
            labels: graphic.indicators.map(element => element.classe_lulc),
            datasets: [
              {
                data: graphic.indicators.map(element => element.desmat_area_classe_lulc),
                backgroundColor: graphic.indicators.map(element => element.color),
                hoverBackgroundColor: graphic.indicators.map(element => element.color)
              }
            ]
          };

          // graphic.options.height = "60vh";
          // graphic.options.responsive = true
          // graphic.options.maintainAspectRatio = false

          graphic.options.legend.onHover = function (event) {
            event.target.style.cursor = 'pointer';
            graphic.options.legend.labels.fontColor = '#0335fc';
          };

          graphic.options.legend.onLeave = function (event) {

            event.target.style.cursor = 'default';
            graphic.options.legend.labels.fontColor = '#fa1d00';
          };

          graphic.options.tooltips.callbacks = {
            title(tooltipItem, data) {
              return data.labels[tooltipItem[0].index];
            },
            label(tooltipItem, data) {
              let percent = parseFloat(
                data['datasets'][0]['data'][tooltipItem['index']]
              ).toLocaleString('de-DE');
              return percent + ' km²';
            },
            // afterLabel: function (tooltipItem, data) {
            //   return "a calcular";
            // }
          };

        }

      }
      );
    }

  }

  changeSelectedLulcChart(e) {
    let uso_terra = this.layersNames.find(element => element.id === 'terraclass');

    if (this.changeTabSelected === "Uso do Solo" || this.changeTabSelected == "Land Use and Land Cover") {
      if (e.index == 0) {
        uso_terra.selectedType = "uso_solo_terraclass_fip"
      }
      else if (e.index == 1) {
        uso_terra.selectedType = "agricultura_agrosatelite_fip"
      }
      uso_terra.visible = true;
    }

    this.changeVisibility(uso_terra, undefined);

  }

  updateRegion(region) {
    let prodes = this.layersNames.find(element => element.id === 'desmatamento_prodes');

    if (region == this.defaultRegion) {
      this.valueRegion = '';
      this.currentData = '';
      this.desmatInfo = {
        value: 'year=2019',
        Viewvalue: '2018/2019',
        year: 2019
      };

      prodes.selectedType = 'prodes_por_region_fip_img';

    } else {
      prodes.selectedType = 'bi_ce_prodes_desmatamento_100_fip';
      this.infodataMunicipio = null;
    }

    this.changeVisibility(prodes, undefined);

    this.selectRegion = region;

    this.isFilteredByCity = false;
    this.isFilteredByState = false;

    if (this.selectRegion.type == 'city') {
      this.msFilterRegion = ' cd_geocmu = \'' + this.selectRegion.cd_geocmu + '\'';
      this.isFilteredByCity = true;
      this.isFilteredByState = true;
      this.selectRegion.regionTypeBr = 'Município de ';
    } else if (this.selectRegion.type == 'state') {
      this.msFilterRegion = 'uf = \'' + this.selectRegion.value + '\'';
      this.isFilteredByState = true;
    } else { this.msFilterRegion = ""; }

    this.updateExtent();
    this.updateSourceAllLayer();
  }

  private getResolutions(projection) {
    let projExtent = projection.getExtent();
    let startResolution = OlExtent.getWidth(projExtent) / 256;
    let resolutions = new Array(22);
    for (let i = 0, ii = resolutions.length; i < ii; ++i) {
      resolutions[i] = startResolution / Math.pow(2, i);
    }
    return resolutions;
  }

  openDialog(): void {
    //  @todo REMOVE
    window.document.body.style.cursor = 'auto';
    
    this.dataForDialog.language = this.language;
    this.dataForDialog.textosDaDialog = this.textOnDialog;
    
    let dialogRef = this.dialog.open(DialogOverviewExampleDialog, {
      width: window.innerWidth - 150 + 'px',
      height: window.innerHeight - 50 + 'px',
      data: this.dataForDialog,
    });
  }

  private createMap() {
    this.createBaseLayers();
    this.createLayers();

    this.map = new OlMap({
      target: 'map',
      layers: this.layers,
      view: new OlView({
        center: OlProj.fromLonLat([-49, -13.5]),
        projection: this.projection,
        zoom: this.currentZoom,
        maxZoom: 18,
        minZoom: 2
      }),
      loadTilesWhileAnimating: true,
      loadTilesWhileInteracting: true,
      interactions: defaultInteractions({ altShiftDragRotate: false, pinchRotate: false })
    });

    let style = new Style({
      image: new Circle({
        radius: 7,
        fill: new Fill({ color: '#b8714e', width: 1 }),
        stroke: new Stroke({ color: '#7b2900', width: 2 })
      })
    });


    let prodes = this.layersNames.find(element => element.id === 'desmatamento_prodes');
    let deter = this.layersNames.find(element => element.id === 'desmatamento_deter');

    if (prodes.visible || deter.visible) {

      this.infoOverlay = new Overlay({
        element: document.getElementById('map-info'),
        offset: [15, 15],
        stopEvent: false
      });

      this.keyForPointer = this.map.on(
        'pointermove',
        this.callbackPointerMoveMap.bind(this)
      );

      this.keyForClick = this.map.on(
        'singleclick',
        this.callbackClickMap.bind(this)
      );

      this.map.addOverlay(this.infoOverlay);
    }
  }

  private callbackPointerMoveMap(evt) {

    let utfgridlayerVisible = this.utfgridlayer.getVisible();
    if (!utfgridlayerVisible || evt.dragging) {
      return;
    }

    let utfgridlayerVisibleCampo = this.utfgridlayerCampo.getVisible();
    if (!utfgridlayerVisibleCampo || evt.dragging) {
      return;
    }

    let utfgridlayerVisibleMunicipio = this.utfgridlayerMunicipio.getVisible();
    if (!utfgridlayerVisibleMunicipio || evt.dragging) {
      return;
    }


    let prodes = this.layersNames.find(element => element.id === 'desmatamento_prodes');
    let deter = this.layersNames.find(element => element.id === "desmatamento_deter");

    if (prodes.visible || deter.visible) {

      let coordinate = this.map.getEventCoordinate(evt.originalEvent);
      let viewResolution = this.map.getView().getResolution();

      let isCampo = false;
      let isOficial = false;
      let isMunicipio = false;


      if (prodes.selectedType == 'bi_ce_prodes_desmatamento_100_fip' || deter.selectedType === 'bi_ce_deter_desmatamento_100_fip') {
        isOficial = true;
      }

      if ((prodes.selectedType == 'bi_ce_prodes_desmatamento_pontos_campo_fip') ||
        (deter.selectedType == 'bi_ce_deter_desmatamento_pontos_campo_fip')) {
        isCampo = true;
      }

      if ((prodes.selectedType == 'prodes_por_region_fip_img')) {
        isMunicipio = true;
      }

      if (isMunicipio) {
        if (this.utfgridmunicipio) {
          this.utfgridmunicipio.forDataAtCoordinateAndResolution(coordinate, viewResolution, function (data) {
            if (data) {

              if (prodes.visible && (prodes.selectedType == 'prodes_por_region_fip_img')) {
                // console.log(this.infodataMunicipio)
                window.document.body.style.cursor = 'pointer';
                this.infodataMunicipio = data;
                this.infodataMunicipio.region_display = this.infodataMunicipio.region_display.toUpperCase();

                this.infodataMunicipio.area_app_show = this.infodataMunicipio.area_app == '' ? this.minireportText.undisclosed_message : ('' + (Math.round(this.infodataMunicipio.area_app * 100) / 100) + ' km²').replace('.', ',');
                this.infodataMunicipio.area_rl_show = this.infodataMunicipio.area_rl == '' ? this.minireportText.undisclosed_message : ('' + (Math.round(this.infodataMunicipio.area_rl * 100) / 100) + ' km²').replace('.', ',');
              } else {
                this.infodataMunicipio = null;
              }

              this.infoOverlay.setPosition(data ? coordinate : undefined);

            } else {
              window.document.body.style.cursor = 'auto';
              this.infodataMunicipio = null;
            }

          }.bind(this)
          );
        }
      }

      if (isOficial) {

        let openOficial = false;

        if ((prodes.selectedType == 'bi_ce_prodes_desmatamento_100_fip') || (deter.selectedType === 'bi_ce_deter_desmatamento_100_fip')) {

          if (this.utfgridsource) {
            this.utfgridsource.forDataAtCoordinateAndResolution(coordinate, viewResolution, function (data) {
              if (data) {

                isCampo = false;
                data.origin_table = data.origin_table.toUpperCase();
                if (prodes.visible && (prodes.selectedType == 'bi_ce_prodes_desmatamento_100_fip')) {
                  if (data.origin_table == 'PRODES') {
                    window.document.body.style.cursor = 'pointer';
                    this.infodata = data;
                    this.infodata.dataFormatada = this.infodata.data_detec == '' ? this.minireportText.undisclosed_message : this.datePipe.transform(new Date(this.infodata.data_detec), 'dd/MM/yyyy');
                    this.infodata.sucept_desmatFormatada = this.infodata.sucept_desmat == null ? this.minireportText.not_computed_message : ('' + (this.infodata.sucept_desmat * 100).toFixed(2) + '%').replace('.', ',');
                    this.infodata.municipio = this.infodata.municipio.toUpperCase();
                    openOficial = true;
                    this.infoOverlay.setPosition(this.infodata ? coordinate : undefined);
                  }
                }
                if (!openOficial && deter.visible && (deter.selectedType == 'bi_ce_deter_desmatamento_100_fip')) {
                  if (data.origin_table == 'DETER') {
                    window.document.body.style.cursor = 'pointer';
                    this.infodata = data;
                    this.infodata.dataFormatada = this.infodata.data_detec == '' ? this.minireportText.undisclosed_message : this.datePipe.transform(new Date(this.infodata.data_detec), 'dd/MM/yyyy');
                    this.infodata.sucept_desmatFormatada = this.infodata.sucept_desmat == '' ? this.minireportText.not_computed_message : ('' + (this.infodata.sucept_desmat * 100).toFixed(2) + '%').replace('.', ',');
                    this.infodata.municipio = this.infodata.municipio.toUpperCase();

                    this.infoOverlay.setPosition(this.infodata ? coordinate : undefined);
                  }
                }

                // this.infoOverlay.setPosition(data ? coordinate : undefined);

              } else {
                window.document.body.style.cursor = 'auto';
                this.infodata = null;
              }

            }.bind(this)
            );
          }
        }
      }

      if (isCampo) {
        let openCampo = false;
        if ((prodes.selectedType == 'bi_ce_prodes_desmatamento_pontos_campo_fip') ||
          (deter.selectedType == 'bi_ce_deter_desmatamento_pontos_campo_fip')) {

          if (this.utfgridCampo) {
            coordinate = this.map.getEventCoordinate(evt.originalEvent);
            let viewResolution = this.map.getView().getResolution();

            this.utfgridCampo.forDataAtCoordinateAndResolution(coordinate, viewResolution, function (data) {
              if (data) {

                data.origin_table = data.origin_table.toUpperCase();

                if (prodes.visible && (prodes.selectedType == 'bi_ce_prodes_desmatamento_pontos_campo_fip')) {
                  if (data.origin_table == 'PRODES') {
                    window.document.body.style.cursor = 'pointer';

                    this.infodataCampo = data;
                    this.infodataCampo.dataFormatada = this.infodataCampo.data_detec == '' ? this.minireportText.undisclosed_message : this.datePipe.transform(new Date(this.infodataCampo.data_detec), 'dd/MM/yyyy');
                    this.infodataCampo.sucept_desmatFormatada = this.infodataCampo.sucept_desmat == '' ? this.minireportText.not_computed_message : ('' + (this.infodataCampo.sucept_desmat * 100).toFixed(2) + '%').replace('.', ',');
                    this.infodataCampo.origin_table = this.infodataCampo.origin_table.toUpperCase();
                    openCampo = true;
                    this.infoOverlay.setPosition(this.infodataCampo ? coordinate : undefined);
                  }
                }
                if (!openCampo && deter.visible && (deter.selectedType == 'bi_ce_deter_desmatamento_pontos_campo_fip')) {
                  if (data.origin_table == 'DETER') {
                    window.document.body.style.cursor = 'pointer';
                    this.infodataCampo = data;
                    this.infodataCampo.dataFormatada = this.infodataCampo.data_detec == '' ? this.minireportText.undisclosed_message : this.datePipe.transform(new Date(this.infodataCampo.data_detec), 'dd/MM/yyyy');
                    this.infodataCampo.sucept_desmatFormatada = this.infodataCampo.sucept_desmat == '' ? this.minireportText.not_computed_message : ('' + (this.infodataCampo.sucept_desmat * 100).toFixed(2) + '%').replace('.', ',');
                    this.infodataCampo.origin_table = this.infodataCampo.origin_table.toUpperCase();
                    this.infodataCampo.municipio = this.infodataCampo.municipio.toUpperCase();
                    this.infoOverlay.setPosition(this.infodataCampo ? coordinate : undefined);
                  }
                }

                // this.infoOverlay.setPosition(data ? coordinate : undefined);
              } else {
                this.infodataCampo = null;
                window.document.body.style.cursor = 'auto';
              }
            }.bind(this)
            );
          }
        }

      }
    }
  }

  callbackClickMap(evt) {

    let zoom = this.map.getView().getZoom();
    let viewResolution = this.map.getView().getResolution();
    let coordinate = null;

    coordinate = this.map.getEventCoordinate(evt.originalEvent);

    let prodes = this.layersNames.find(element => element.id === 'desmatamento_prodes');
    let deter = this.layersNames.find(element => element.id === 'desmatamento_deter');

    let layers = this.layersNames;

    if (prodes.visible || deter.visible) {

      let isCampo = false;
      let isOficial = false;
      let isMunicipio = false;
      let isABC = false;

      if (prodes.selectedType == 'bi_ce_prodes_desmatamento_100_fip' || deter.selectedType == 'bi_ce_deter_desmatamento_100_fip' ) {
        isOficial = true;
      }

      if ((prodes.selectedType == 'bi_ce_prodes_desmatamento_pontos_campo_fip') ||
        (deter.selectedType == 'bi_ce_deter_desmatamento_pontos_campo_fip')) {
        isCampo = true;
      }

      if ((prodes.selectedType == 'prodes_por_region_fip_img')) {
        isMunicipio = true;
      }

      if(prodes.selectedType == 'bi_ce_prodes_desmatamento_abc_fip'){
        isABC = true;
      }

      if (isMunicipio) {
        if (this.utfgridmunicipio) {
          this.utfgridmunicipio.forDataAtCoordinateAndResolution(coordinate, viewResolution, function (data) {

            if (data) {
              // console.log(OlProj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326'))

              if (prodes.visible && (prodes.selectedType == 'prodes_por_region_fip_img')) {

                this.http.get(SEARCH_URL, { params: PARAMS.set('key', data.region_name) }).subscribe(result => {
                  let ob = result[0];

                  this.currentData = ob.text;
                  this.updateRegion(ob);

                  let prodes = this.layersNames.find(element => element.id === 'desmatamento_prodes');
                  prodes.selectedType = 'bi_ce_prodes_desmatamento_100_fip';
                  this.changeVisibility(prodes, undefined);
                  this.infodataMunicipio = null;

                });
              }
            }
          }.bind(this)
          );
        }
      }

      if(isABC)
      {
        if (this.utfgridabc) {
          this.utfgridabc.forDataAtCoordinateAndResolution(coordinate, viewResolution, function (data) {

            if (data) {
              // console.log(OlProj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326'))

              if (prodes.visible && (prodes.selectedType == 'bi_ce_prodes_desmatamento_abc_fip')) {
                this.dataForDialog = data;
                this.dataForDialog.origin_table = 'PRODES';
                this.dataForDialog.dataFormatada = this.dataForDialog.data_detec == '' ? this.minireportText.undisclosed_message : this.datePipe.transform(new Date(this.dataForDialog.data_detec), 'dd/MM/yyyy');
                this.dataForDialog.coordinate = coordinate;
                this.dataForDialog.datePipe = this.datePipe;
                this.dataForDialog.layers = layers;
                this.dataForDialog.year = new Date(this.dataForDialog.data_detec).getFullYear() ;

                this.openDialog();

              }
            }
          }.bind(this)
          );
        }
      }

      if (isCampo) {

        let open = false;
        if (this.utfgridCampo) {
          this.utfgridCampo.forDataAtCoordinateAndResolution(coordinate, viewResolution, function (data) {

            if (data) {
              // console.log(OlProj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326'))

              if (prodes.visible && (prodes.selectedType == 'bi_ce_prodes_desmatamento_pontos_campo_fip')) {

                isOficial = false;
                this.dataForDialog = data;
                this.dataForDialog.coordinate = coordinate;
                this.dataForDialog.year = new Date(this.dataForDialog.data_detec).getFullYear();
                this.dataForDialog.layers = layers;
                this.dataForDialog.datePipe = this.datePipe;
                open = true;
                this.openDialog();
              }

              if (!open && deter.visible && (deter.selectedType == 'bi_ce_deter_desmatamento_pontos_campo_fip')) {
                isOficial = false;
                this.dataForDialog = data;
                this.dataForDialog.coordinate = coordinate;
                this.dataForDialog.year = new Date(this.dataForDialog.data_detec).getFullYear();
                this.dataForDialog.layers = layers;
                this.dataForDialog.datePipe = this.datePipe;
                this.openDialog();
              }

            }
          }.bind(this)
          );
        }
      }

      if (isOficial) {

        let openOficial = false;
        if (this.utfgridsource) {
          this.utfgridsource.forDataAtCoordinateAndResolution(coordinate, viewResolution, function (data) {
            if (data) {

              // console.log(OlProj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326'))
              if (prodes.visible && (prodes.selectedType == 'bi_ce_prodes_desmatamento_100_fip')) {
                this.dataForDialog = data;
                this.dataForDialog.coordinate = coordinate;
                this.dataForDialog.datePipe = this.datePipe;
                this.dataForDialog.layers = layers;
                this.dataForDialog.year = this.selectedTimeFromLayerType('bi_ce_prodes_desmatamento_100_fip').year;
                openOficial = true;
                this.openDialog();
              }


              if (!openOficial && deter.visible && (deter.selectedType == 'bi_ce_deter_desmatamento_100_fip')) {
                this.dataForDialog = data;
                this.dataForDialog.coordinate = coordinate;
                this.dataForDialog.datePipe = this.datePipe;
                this.dataForDialog.layers = layers;
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
            'https://api.tiles.mapbox.com/v4/mapbox.light/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'
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
            'VmCqTus7G3OxlDECYJ7O~G3Wj1uu3KG6y-zycuPHKrg~AhbMxjZ7yyYZ78AjwOVIV-5dcP5ou20yZSEVeXxqR2fTED91m_g4zpCobegW4NPY',
          imagerySet: 'Aerial'
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
            'VmCqTus7G3OxlDECYJ7O~G3Wj1uu3KG6y-zycuPHKrg~AhbMxjZ7yyYZ78AjwOVIV-5dcP5ou20yZSEVeXxqR2fTED91m_g4zpCobegW4NPY',
          imagerySet: 'Road'
        }),
        visible: false
      })
    };

    this.relevo = {
      visible: false,
      layer: new OlTileLayer({
        source: new OlXYZ({
          url:
            'https://server.arcgisonline.com/ArcGIS/rest/services/' +
            'World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}'
        }),
        visible: false
      })
    };

    this.landsat = {
      visible: false,
      layer: new OlTileLayer({
        source: new TileWMS({
          url: 'http://mapbiomas-staging.terras.agr.br/wms',
          projection: 'EPSG:3857',
          params: {
            LAYERS: 'rgb',
            SERVICE: 'WMS',
            TILED: true,
            VERSION: '1.1.1',
            TRANSPARENT: 'true',
            MAP: 'wms/v/staging/classification/rgb.map',
            YEAR: 2017
          },
          serverType: 'mapserver',
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
    let olLayers: OlTileLayer[] = new Array();

    // layers
    for (let layer of this.layersTypes) {
      this.LayersTMS[layer.value] = this.createTMSLayer(layer);
      this.layers.push(this.LayersTMS[layer.value]);
    }

    // limits
    for (let limits of this.limitsNames) {
      this.limitsTMS[limits.value] = this.createTMSLayer(limits);
      this.layers.push(this.limitsTMS[limits.value]);
    }

    this.regionsLimits = this.createVectorLayer('regions', '#666633', 3);
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

    this.utfgridabc = new UTFGrid({
      tileJSON: this.getTileJSONABC()
    });

    this.utfgridlayerabc = new OlTileLayer({
      source: this.utfgridabc
    });

    this.layers.push(this.utfgridlayer);
    this.layers.push(this.utfgridlayerCampo);
    this.layers.push(this.utfgridlayerMunicipio);
    this.layers.push(this.utfgridlayerabc);

    this.layers = this.layers.concat(olLayers.reverse());
  }

  private getTileJSON() {

    let text = '';

    let prodes = this.layersNames.find(element => element.id === 'desmatamento_prodes');
    let deter = this.layersNames.find(element => element.id === 'desmatamento_deter');

    if (prodes.visible && deter.visible) {
      text = '((origin_table = \'prodes\' AND ' + this.selectedTimeFromLayerType('bi_ce_prodes_desmatamento_100_fip').value + ')'
        + ' OR ' + '(origin_table = \'deter\' AND ' + this.selectedTimeFromLayerType('bi_ce_deter_desmatamento_100_fip').value + '))';
    }
    else if (prodes.visible && !deter.visible) {
      text = '(origin_table = \'prodes\' AND ' + this.selectedTimeFromLayerType('bi_ce_prodes_desmatamento_100_fip').value + ')';
    }
    else if (!prodes.visible && deter.visible) {
      text = '(origin_table = \'deter\' AND ' + this.selectedTimeFromLayerType('bi_ce_deter_desmatamento_100_fip').value + ')';
    }
    else {
      text = '1=1'
    }


    if (this.selectRegion.type === 'city') {
      text += ' AND cd_geocmu = \'' + this.selectRegion.cd_geocmu + '\'';
    } else if (this.selectRegion.type === 'state') {
      text += ' AND uf = \'' + this.selectRegion.value + '\'';
    }

    return {
      version: '2.2.0',
      grids: [
        this.returnUTFGRID('bi_ce_info_utfgrid_fip', text, '{x}+{y}+{z}')
      ]
    };

  }

  private getTileJSONCampo() {

    let text = '1=1';

    // let prodes = this.layersNames.find(element => element.id === 'desmatamento_prodes');
    // let deter = this.layersNames.find(element => element.id === 'desmatamento_deter');

    // if (prodes.visible && deter.visible) {
    //   text = '1=1';
    // }
    // else if (prodes.visible && !deter.visible) {
    //   text = 'p.origin_table = \'prodes\' ';
    // }
    // else if (!prodes.visible && deter.visible) {
    //   text = 'p.origin_table = \'deter\' ';
    // }
    // else {
    //   text = '1=1'
    // }

    if (this.selectRegion.type === 'city') {
      text += ' AND p.cd_geocmu = \'' + this.selectRegion.cd_geocmu + '\'';
    } else if (this.selectRegion.type === 'state') {
      text += ' AND p.uf = \'' + this.selectRegion.value + '\'';
    }

    return {
      version: '2.2.0',
      grids: [
        this.returnUTFGRID('bi_ce_info_utfgrid_pontos_campo_fip', text, '{x}+{y}+{z}')
      ]
    };

  }

  private getTileJSONMunicipio() {

    let text = '1=1';

    let time = this.selectedTimeFromLayerType('prodes_por_region_fip_img');

    if (this.selectRegion.type === 'city' || this.selectRegion.type === 'state') {
      text += ' AND region_type = \'' + this.selectRegion.type + '\'';
    }

    text += ' AND ' + time.value;

    return {
      version: '2.2.0',
      grids: [
        this.returnUTFGRID('prodes_por_region_fip_utfgrid', text, '{x}+{y}+{z}')
      ]
    };

  }

  private getTileJSONABC() {

    let text = '1=1';

    if (this.selectRegion.type === 'city') {
      text += ' AND cd_geocmu = \'' + this.selectRegion.cd_geocmu + '\'';
    } else if (this.selectRegion.type === 'state') {
      text += ' AND uf = \'' + this.selectRegion.value + '\'';
    }

    return {
      version: '2.2.0',
      grids: [
        this.returnUTFGRID('bi_ce_prodes_desmatamento_abc_fip', text, '{x}+{y}+{z}')
      ]
    };

  }

  private returnUTFGRID(layername, filter, tile) {
    return '/ows?layers=' + layername + '&MSFILTER=' + filter + '&mode=tile&tile=' + tile + '&tilemode=gmap&map.imagetype=utfgrid'
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
            color: '#dedede',
            width: width + 1
          })
        }),
        new Style({
          stroke: new Stroke({
            color: strokeColor,
            width
          })
        })
      ]
    });
  }

  private parseUrls(layer) {
    let result = [];

    let filters = [];

    if (layer.timeHandler == 'msfilter' && layer.times) {
      filters.push(layer.timeSelected);
    }
    if (layer.layerfilter) { filters.push(layer.layerfilter); }
    if (this.regionFilterDefault) { filters.push(this.regionFilterDefault); }
    if (layer.regionFilter && this.msFilterRegion) {
      filters.push(this.msFilterRegion);
    }

    let msfilter = '';
    if (filters.length > 0) { msfilter += '&MSFILTER=' + filters.join(' AND '); }

    let layername = layer.value;
    if (layer.timeHandler == 'layername') { layername = layer.timeSelected; }

    for (let url of this.urls) {
      result.push(url + '?layers=' + layername + msfilter + '&mode=tile&tile={x}+{y}+{z}' + '&tilemode=gmap' + '&map.imagetype=png');
    }
    return result;
  }

  private updateSourceAllLayer() {
    for (let layer of this.layersTypes) {
      this.updateSourceLayer(layer);
    }
  }

  private updateSourceLayer(layer) {
    if (layer['times']) {
      this.periodSelected = layer['times'].find(
        element => element.value === layer.timeSelected
      );
    }

    if (layer['value'] === 'bi_ce_prodes_desmatamento_100_fip' || layer['value'] === 'prodes_por_region_fip_img') {
      this.desmatInfo = this.periodSelected;
      this.updateCharts();
    }

    this.handleInteraction();

    let source_layers = this.LayersTMS[layer.value].getSource();
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
    // limits
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

    let prodes = this.layersNames.find(element => element.id === 'desmatamento_prodes');
    let deter = this.layersNames.find(element => element.id === 'desmatamento_deter');

    if (prodes.visible || deter.visible) {

      if ((prodes.selectedType == 'bi_ce_prodes_desmatamento_100_fip') || (deter.selectedType == 'bi_ce_deter_desmatamento_100_fip')) {

        if (this.utfgridsource) {
          let tileJSON = this.getTileJSON();

          this.utfgridsource.tileUrlFunction_ = _ol_TileUrlFunction_.createFromTemplates(tileJSON.grids, this.utfgridsource.tileGrid);
          this.utfgridsource.tileJSON = tileJSON;
          this.utfgridsource.refresh();

          this.utfgridlayer.setVisible(true);
        }
      }

      if ((prodes.selectedType == 'bi_ce_prodes_desmatamento_pontos_campo_fip') || (deter.selectedType == 'bi_ce_deter_desmatamento_pontos_campo_fip')) {
        if (this.utfgridCampo) {
          let tileJSONCampo = this.getTileJSONCampo();

          this.utfgridCampo.tileUrlFunction_ = _ol_TileUrlFunction_.createFromTemplates(tileJSONCampo.grids, this.utfgridCampo.tileGrid);
          this.utfgridCampo.tileJSON = tileJSONCampo;
          this.utfgridCampo.refresh();

          this.utfgridlayerCampo.setVisible(true);
        }

      }

      if ((prodes.selectedType == 'prodes_por_region_fip_img')) {
        if (this.utfgridmunicipio) {
          let tileJSONMunicipio = this.getTileJSONMunicipio();

          this.utfgridmunicipio.tileUrlFunction_ = _ol_TileUrlFunction_.createFromTemplates(tileJSONMunicipio.grids, this.utfgridmunicipio.tileGrid);
          this.utfgridmunicipio.tileJSON = tileJSONMunicipio;
          this.utfgridmunicipio.refresh();

          this.utfgridlayerMunicipio.setVisible(true);
        }
      }

      if ((prodes.selectedType == 'bi_ce_prodes_desmatamento_abc_fip')) {
        if (this.utfgridabc) {
          let tileJSONabc = this.getTileJSONABC();

          this.utfgridabc.tileUrlFunction_ = _ol_TileUrlFunction_.createFromTemplates(tileJSONabc.grids, this.utfgridabc.tileGrid);
          this.utfgridabc.tileJSON = tileJSONabc;
          this.utfgridabc.refresh();

          this.utfgridlayerabc.setVisible(true);
        }
      }

    } else if (this.utfgridsource && this.utfgridCampo && this.utfgridmunicipio && this.utfgridabc) {
      this.utfgridlayer.setVisible(false);
      this.utfgridlayerCampo.setVisible(false);
      this.utfgridlayerMunicipio.setVisible(false);
      this.utfgridlayerabc.setVisible(false);
    }


  }

  changeVisibility(layer, e) {
    for (let layerType of layer.types) {
      this.LayersTMS[layerType.value].setVisible(false);
    }

    if (e != undefined) {
      layer.visible = e.checked;
    }

    if (layer.id == "desmatamento_prodes" || layer.id == "desmatamento_deter") {
      if (layer.visible) {
        this.handleInteraction();
      }
    }
    this.LayersTMS[layer.selectedType].setVisible(layer.visible);


  }

  private updateDescriptor() {

    this.descriptor.type = this.descriptorText.type_of_information_label[this.language];

    for (let group of this.descriptor.groups) {

      group.label = this.descriptorText[group.id].label[this.language];

      for (let layer of group.layers) {
        layer.label = this.descriptorText[group.id].layers[layer.id].label[this.language];

        for (let layerType of layer.types) {

          if (this.descriptorText[group.id].layers[layer.id].hasOwnProperty('types')) {

            if (this.descriptorText[group.id].layers[layer.id].types[layerType.value].hasOwnProperty('view_value')) {

              layerType.Viewvalue = this.descriptorText[group.id].layers[layer.id].types[layerType.value].view_value[this.language];
            }
            if (this.descriptorText[group.id].layers[layer.id].types[layerType.value].hasOwnProperty('timelabel')) {
              layerType.timeLabel = this.descriptorText[group.id].layers[layer.id].types[layerType.value].timelabel[this.language];
            }

            if (layerType.times) {
              for (let time of layerType.times) {

                if (this.descriptorText[group.id].layers[layer.id].types[layerType.value].hasOwnProperty('times[time.value]')) {
                  time.Viewvalue = this.descriptorText[group.id].layers[layer.id].types[layerType.value].times[time.value][this.language]
                }
              }
            }
          }
        }
      }
    }

    for (let basemap of this.descriptor.basemaps) {
      for (let types of basemap.types) {
        types.viewValue = this.descriptorText.basemaps.types[types.value][this.language];
      }
    }

    for (let limits of this.descriptor.limits) {
      for (let types of limits.types) {

        types.Viewvalue = this.descriptorText.limits.types[types.value][this.language];
      }
    }

  }

  public onFileComplete(data: any) {

    let map = this.map;

    this.layerFromUpload.checked = false;

    if (this.layerFromUpload.layer != null) {
      map.removeLayer(this.layerFromUpload.layer);
    }
    if (!data.hasOwnProperty('features')) {
      return;
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

    let vectorSource = new VectorSource({
      features: (new GeoJSON()).readFeatures(data, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
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

      let prodes = this.layersNames.find(element => element.id === 'desmatamento_prodes');
      prodes.selectedType = 'bi_ce_prodes_desmatamento_100_fip';
      this.changeVisibility(prodes, undefined);
      this.infodataMunicipio = null;

    } else {
      map.removeLayer(this.layerFromUpload.layer);
    }

  }

  private getMetadata(metadata) {
    let _metadata = [];
    let lang = this.language;

    metadata.forEach(function (data) {
      _metadata.push({ title: data.title[lang], description: data.description[lang] });
    });

    return _metadata;
  }

  openDialogMetadata(layer) {

    let metadata = [];
    let self = this;

    if (layer.hasOwnProperty('metadata')) {
      metadata = this.getMetadata(layer.metadata);
    } else {
      let selectedType = layer.selectedType;
      layer.types.forEach(function (type) {
        if (type.value == selectedType) {
          metadata = self.getMetadata(type.metadata);
        }
      });
    }

    let dialogRef = this.dialog.open(MetadataComponent, {
      width: '130vh',
      data: { metadata }
    });

    dialogRef.afterClosed().subscribe(result => {
      // console.log('The dialog was closed');
    });
  }

  hasDownload(type, typeData){
    return typeData.download.includes(type);
  }

  downloadCSV(layer) {

    let parameters = {
      "layer": layer,
      "selectedRegion": this.selectRegion,
      "times": this.selectedTimeFromLayerType(layer.selectedType.value)
    };

    this.http.post("/service/download/csv", parameters, {responseType: 'blob'})
        .toPromise()
        .then(blob => {
          saveAs(blob, parameters.layer.selectedType+'_'+ parameters.selectedRegion.type +'_'+ parameters.times + '.csv');
          this.loadingCSV = false;
        }).catch(err => this.loadingCSV = false);
  }

  downloadSHP(layer){
    let parameters = {
        "layer": layer,
        "selectedRegion": this.selectRegion,
        "times": this.selectedTimeFromLayerType(layer.selectedType)
    };

    this.http.post("/service/download/shp", parameters, {responseType: 'blob'})
    .toPromise()
    .then(blob => {
      saveAs(blob, parameters.layer.selectedType+'_'+ parameters.selectedRegion.type +'_'+ layer.selectedType.year + '.zip');
      this.loadingSHP = false;
    }).catch(err => this.loadingSHP = false);
  }

  buttonDownload(tipo, layer, e) {
    if (tipo == 'csv') {
      this.loadingCSV = true;
      this.downloadCSV(layer);
    } else {
      this.loadingSHP = true;
      this.downloadSHP(layer);
    }
  }

  zoomIn(level = 0.7) {
    this.map.getView().setZoom(this.map.getView().getZoom() +level)
  }

  zoomOut(level = 0.7) {
    this.map.getView().setZoom(this.map.getView().getZoom() -level)
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.innerHeigth = window.innerHeight;
    if (window.innerWidth < 1600) {
      this.collapseLegends = false;
      this.collapseLayer = true;
      this.collapseCharts = true;
      this.currentZoom = 4;
    } else {
      this.collapseLayer = false;
      this.collapseCharts = false;
      this.currentZoom = 6;
    }

    if (window.innerWidth < 900) {
      this.router.navigate(['/mobile']);
    }
  }

  handleDrawer() {
    this.showDrawer = !this.showDrawer;
  }

  async openReport(params){

    let coordinate = null;
    let layers = null;
    let paramsReport = null;
    let token = params.params.token;

    let dados = await this.http.get('http://covid.bio.br/' + token).toPromise();

    if(Array.isArray(dados)){
      paramsReport = JSON.parse(atob(dados[0].params))
      layers = paramsReport.layers;
    }else{
      console.log('Relatório não encontrado');
      return ;
    }

    let prodes = layers.find(element => element.id === 'desmatamento_prodes');
    let deter = layers.find(element => element.id === 'desmatamento_deter');


    if (prodes.visible || deter.visible) {

      let isCampo = false;
      let isOficial = false;
      let isMunicipio = false;
      let isABC = false;

      if (prodes.selectedType == 'bi_ce_prodes_desmatamento_100_fip' || deter.selectedType == 'bi_ce_deter_desmatamento_100_fip' ) {
        isOficial = true;
      }

      if ((prodes.selectedType == 'bi_ce_prodes_desmatamento_pontos_campo_fip') ||
          (deter.selectedType == 'bi_ce_deter_desmatamento_pontos_campo_fip')) {
        isCampo = true;
      }

      if ((prodes.selectedType == 'prodes_por_region_fip_img')) {
        isMunicipio = true;
      }

      if(prodes.selectedType == 'bi_ce_prodes_desmatamento_abc_fip'){
        isABC = true;
      }

      if (isMunicipio) {
      }

      if(isABC)
      {
        if (prodes.visible && (prodes.selectedType == 'bi_ce_prodes_desmatamento_abc_fip')) {
          this.dataForDialog = paramsReport;
          this.dataForDialog.origin_table = 'PRODES';
          this.dataForDialog.dataFormatada = this.dataForDialog.data_detec == '' ? this.minireportText.undisclosed_message : this.datePipe.transform(new Date(this.dataForDialog.data_detec), 'dd/MM/yyyy');
          this.dataForDialog.coordinate = coordinate;
          this.dataForDialog.datePipe = this.datePipe;
          this.dataForDialog.year = new Date(this.dataForDialog.data_detec).getFullYear() ;

          this.openDialog();

        }
      }

      if (isCampo) {

        let open = false;
        if (prodes.visible && (prodes.selectedType == 'bi_ce_prodes_desmatamento_pontos_campo_fip')) {

          isOficial = false;
          this.dataForDialog = paramsReport;
          this.dataForDialog.coordinate = coordinate;
          this.dataForDialog.year = new Date(this.dataForDialog.data_detec).getFullYear();
          this.dataForDialog.layers = layers;
          this.dataForDialog.datePipe = this.datePipe;
          open = true;
          this.openDialog();
        }

        if (!open && deter.visible && (deter.selectedType == 'bi_ce_deter_desmatamento_pontos_campo_fip')) {
          isOficial = false;
          this.dataForDialog = paramsReport;
          this.dataForDialog.coordinate = coordinate;
          this.dataForDialog.year = new Date(this.dataForDialog.data_detec).getFullYear();
          this.dataForDialog.layers = layers;
          this.dataForDialog.datePipe = this.datePipe;
          this.openDialog();
        }
      }

      if (isOficial) {
        let openOficial = false;
        if (prodes.visible && (prodes.selectedType == 'bi_ce_prodes_desmatamento_100_fip')) {
          this.dataForDialog = paramsReport;
          this.dataForDialog.coordinate = coordinate;
          this.dataForDialog.datePipe = this.datePipe;
          this.dataForDialog.layers = layers;
          this.dataForDialog.year = this.selectedTimeFromLayerType('bi_ce_prodes_desmatamento_100_fip').year;
          openOficial = true;
          this.openDialog();
        }


        if (!openOficial && deter.visible && (deter.selectedType == 'bi_ce_deter_desmatamento_100_fip')) {
          this.dataForDialog = paramsReport;
          this.dataForDialog.coordinate = coordinate;
          this.dataForDialog.datePipe = this.datePipe;
          this.dataForDialog.layers = layers;
          this.dataForDialog.year = new Date(this.dataForDialog.data_detec).getFullYear();
          this.openDialog();
        }

      }

    }
  }

  ngOnInit() {

    let descriptorURL = '/service/map/descriptor' + this.getServiceParams();

    this.http.get(descriptorURL).subscribe(result => {
      this.descriptor = result;
      this.regionFilterDefault = this.descriptor.regionFilterDefault;


      for (let group of this.descriptor.groups) {
        for (let layer of group.layers) {
          if (layer.id != 'satelite') {
            for (let type of layer.types) {
              type.urlLegend = this.urls[0] + '?TRANSPARENT=TRUE&VERSION=1.1.1&SERVICE=WMS&REQUEST=GetLegendGraphic&layer=' + type.value + '&format=image/png';
            }
            this.layersNames.push(layer);
          }

          for (let layerType of layer.types) {
            layerType.visible = false;
            if (layer.selectedType == layerType.value) {
              layerType.visible = layer.visible;
            }

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
    // keep height of window
    this.innerHeigth = window.innerHeight;

    if (window.innerWidth < 1600) {
      this.collapseLegends = false;
      this.collapseLayer = true;
      this.collapseCharts = true;
      this.currentZoom = 5.3;
    } else {
      this.currentZoom = 5.8;
    }

    // Register of SVG icons
    this.matIconRegistry.addSvgIcon(
      `info`,
      this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/img/info.svg')
    );

    this.matIconRegistry.addSvgIcon(
      `shp`,
      this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/img/shp.svg')
    );

    this.matIconRegistry.addSvgIcon(
      `csv`,
      this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/img/csv.svg')
    );

    if (window.innerWidth < 900) {
      this.router.navigate(['/mobile']);
    }

    let self = this;
    self.route.paramMap.subscribe(function(params) {
      if( params.keys.length > 0){
        self.openReport(params);
      }
    });
  }
}

@Component({
  selector: 'app-map',
  templateUrl: './dialog-laudo.html',
  styleUrls: ['./map.component.css']
})
export class DialogOverviewExampleDialog implements OnInit, OnDestroy {
  indexAccordion = 0;

  images: any[];
  defaultImg = '';
  urlSentinel: Array<{ src: string; caption: string; thumb: string }> = [];
  vetBfast: Array<{ src: string; caption: string; thumb: string }> = [];
  vetSuscept: Array<{ src: string; caption: string; thumb: string }> = [];
  vetCar: Array<{ src: string; caption: string; thumb: string }> = [];
  vetABC: Array<{ src: string; caption: string; thumb: string }> = [];
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

  textOnDialog = {} as any;

  carData: any = [];
  abcData: any = [];
  loading:boolean;

  svgLoading:string;

  albumLandsat: Array<{ src: string; caption: string; thumb: string }> = [];

  galleryOptions: NgxGalleryOptions[];
  galleryDrones: NgxGalleryImage[];
  galleryCamera: NgxGalleryImage[];
  galleryVideos: NgxGalleryImage[];

  httpOptions:any;

  constructor(
    public dialogRef: MatDialogRef<DialogOverviewExampleDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef,
    private _lightbox: Lightbox,
    private decimalPipe: DecimalPipe
  ) {
    this.defaultImg = '';
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
    this.loading = false;

    this.svgLoading = "/assets/img/loading.svg";

    this.initGallery();

    this.httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    };
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
      params.push('origin=' + this.data.origin_table.toLowerCase());
      params.push('gid=' + this.data.gid);

      if (this.data.origin_table.toLowerCase() === 'prodes') {
        params.push("year=" + this.data.year);
      }
      else {
        params.push('year=2018');
      }

      params.push('lang=' + this.data.language);

    }

    let urlParams = '?' + params.join('&');

    return urlParams;
  }

  async getBase64ImageFromUrl(imageUrl) {
    var res = await fetch(imageUrl);
    var blob = await res.blob();

    return new Promise((resolve, reject) => {
      var reader  = new FileReader();
      reader.addEventListener("load", function () {
        resolve(reader.result);
      }, false);

      reader.onerror = () => {
        return reject(this);
      };
      reader.readAsDataURL(blob);
    })
  }

  async printReport(){
    let language = this.data.language;
    let self = this;
    this.loading = true;
    let polygonClass = {};

    if( this.infoDesmat.pathclassefip != '1'){
      polygonClass = {
        image: await this.getBase64ImageFromUrl(this.infoDesmat.pathclassefip),
        width: 150,
        margin:[ 0, 0, 100, 0 ],
      }
    }

    let dd = {
      pageSize: 'A4',

      // by default we use portrait, you can change it to landscape if you wish
      pageOrientation: 'portrait',

      // [left, top, right, bottom]
      pageMargins: [ 40, 70, 40, 80 ],

      header: {
        margin:[ 24, 10, 24, 30 ],
        columns: [
          {
            image: logos.logoDPAT,
            width: 130
          },
          {
            // [left, top, right, bottom]
            margin:[ 65, 15, 10, 10 ],
            text: this.textOnDialog.title.toUpperCase(),
            style: 'titleReport',
          },

        ]
      },
      footer: function (currentPage, pageCount) {
        return {
          table: {
            widths: '*',
            body: [
              [
                { image: logos.signature, colSpan: 3, alignment: 'center', fit: [300, 43]},
                {},
                {},
              ],
              [
                { text: 'https://cerradodpat.org', alignment: 'left', style: 'textFooter', margin: [60, 0, 0, 0]},
                { text:moment().format('DD/MM/YYYY HH:mm:ss'), alignment: 'center', style: 'textFooter', margin: [0, 0, 0, 0]},
                { text: logos.page.title[language] + currentPage.toString() + logos.page.of[language] + '' + pageCount, alignment: 'right', style: 'textFooter', margin: [0, 0, 60, 0]},
              ],
            ]
          },
          layout: 'noBorders'
        };
      },
      content: [
        {text:this.textOnDialog.information_tab.title_tab, style: 'subheader'},
        {
          columns: [
            {
              style: 'tableDpat',
              layout: 'noBorders',
              table: {
                body: [
                  [
                    {text: this.textOnDialog.information_tab.metadados_label.toUpperCase(), alignment: 'left', colSpan:2},
                    {},
                  ],
                  [
                    this.textOnDialog.information_tab.polygon_label,
                    {text: this.data.origin_table+'-CERRADO', alignment: 'left',style: 'data'},
                  ],
                  [
                    this.textOnDialog.information_tab.area_label,
                    {text: this.decimalPipe.transform(this.infoDesmat.area,'1.2-3') +' ' + this.textOnDialog.information_tab.unit_measure, alignment: 'left',style: 'data'},
                  ],
                  [
                    this.textOnDialog.information_tab.municipio_label,
                    {text: this.data.municipio + ' - ' + this.data.uf, alignment: 'left',style: 'data'},
                  ],
                  [
                    this.textOnDialog.information_tab.detection_date_label,
                    {text:  this.data.dataFormatada, alignment: 'left',style: 'data'},
                  ],
                  [
                    this.textOnDialog.information_tab.latitude_label,
                    {text:  this.decimalPipe.transform(this.infoDesmat.latitude,'1.3-6'), alignment: 'left',style: 'data'},
                  ],
                  [
                    this.textOnDialog.information_tab.longitude_label,
                    {text:  this.decimalPipe.transform(this.infoDesmat.longitude,'1.3-6'), alignment: 'left',style: 'data'},
                  ],
                ]
              }
            },
            polygonClass,
          ],
        },
        {
          image: await this.getBase64ImageFromUrl(this.urlSentinel[0].thumb),
          width: 400,
          alignment: 'center'
        },
        { text:this.textOnDialog.information_tab.landsat_image_description + ' ' + this.data.origin_table + '-Cerrado', alignment: 'center', style: 'textImglegend', pageBreak: 'after'},
      ],
      styles: {
        titleReport: {
          fontSize: 16,
          bold: true
        },
        textFooter: {
          fontSize: 9
        },
        textImglegend: {
          fontSize: 9
        },
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10]
        },
        data: {
          bold: true,
        },
        subheader: {
          fontSize: 16,
          bold: true,
          margin: [0, 10, 0, 5]
        },
        codCar: {
          fontSize: 11,
          bold: true,
        },
        textObs: {
          fontSize: 11,
        },
        tableDpat: {
          margin: [0, 5, 0, 15],
          fontSize: 11,
        },
        tableHeader: {
          bold: true,
          fontSize: 13,
          color: 'black'
        },
        metadata:{
          background: '#0b4e26',
          color: '#fff'
        }
      }
    }
    if(this.carData.length > 0 && this.data.year >= 2013){

      dd.content.push({text:this.textOnDialog.car_tab.title_tab, style: 'subheader'})

      for (const [index, item] of this.carData.entries()) {
        let columns = [];

        let nascente = [];
        let area_rl = [];
        let area_desmat_app = [];

        if(item.metaData.qnt_nascente || item.metaData.qnt_nascente > 0){
          nascente.push(self.textOnDialog.car_tab.nascente_car_label);
          nascente.push( {text:item.metaData.qnt_nascente, alignment: 'left',style: 'data'});
        }else{
          nascente.push({},{});
        }
        if(item.metaData.area_rl || item.metaData.area_desmat_rl > 0.1 ){
          area_rl.push(self.textOnDialog.car_tab.display_rl_message[0]);
          area_rl.push({
            text:self.decimalPipe.transform(item.metaData.area_desm,'1.2-3') +
                self.textOnDialog.car_tab.display_rl_message[1]  +
                item.metaData.percentRL  + this.textOnDialog.car_tab.display_rl_message[2],
            alignment: 'left',
            style: 'data'}
          );
        }else{
          area_rl.push({},{});
        }
        if(item.metaData.area_desmat_app && item.metaData.area_desmat_app > 0.1){
          area_desmat_app.push(this.textOnDialog.car_tab.display_app_message[0]);
          area_desmat_app.push({
            text:this.decimalPipe.transform(item.metaData.area_desmat_app,'1.2-3') + ' ' +
                this.textOnDialog.car_tab.display_app_message[1] + ' ' +
                item.metaData.percentAPP + ' ' + this.textOnDialog.car_tab.display_app_message[2],
            alignment: 'left',
            style: 'data'}
          );
        }else{
          area_desmat_app.push({},{});
        }

        let legend = [];

        if(item.imgsCar.legendDesmatamento){
          legend.push(
              {
                image: await self.getBase64ImageFromUrl(item.imgsCar.legendDesmatamento),
                fit: [170, 20],
                alignment: 'left'
              }
          );
        }

        if(item.imgsCar.legendCar){
          legend.push(
              {
                image: await self.getBase64ImageFromUrl(item.imgsCar.legendCar),
                fit: [102, 20],
                alignment: 'left'
              }
          );
        }

        if(item.imgsCar.legendAPP){
          legend.push(
              {
                image: await self.getBase64ImageFromUrl(item.imgsCar.legendAPP),
                fit: [170, 20],
                alignment: 'left'
              }
          );
        }

        if(item.imgsCar.legendRL){
          legend.push(
              {
                image: await self.getBase64ImageFromUrl(item.imgsCar.legendRL),
                fit: [87, 20],
                alignment: 'left'
              }
          );
        }

        if(item.imgsCar.legendNascente){
          legend.push(
              {
                image: await self.getBase64ImageFromUrl(item.imgsCar.legendNascente),
                fit: [102, 20],
                alignment: 'left'
              }
          );
        }

        if(item.metaData.percentDesmat !== ''){
          legend.push(
              {
                text: self.textOnDialog.car_tab.display_car_description_message[0] +
                    self.data.origin_table  +' -CERRADO' +
                    self.textOnDialog.car_tab.display_car_description_message[1] +
                    item.metaData.percentDesmat +
                    self.textOnDialog.car_tab.display_car_description_message[2],
                alignment: 'justify',
                style: 'textObs',
                // [left, top, right, bottom]
                margin:[ 2, 0, 5, 0 ],
              },
          );
        }
        // @ts-ignore
        dd.content.push( {text: self.textOnDialog.car_tab.title_info.toUpperCase(), alignment: 'left', margin: [0, 10, 0, 0]});

        // @ts-ignore
        dd.content.push( {text:  self.textOnDialog.car_tab.cod_car_label + ' '+ item.metaData.cod_car, alignment: 'left', style: 'codCar', margin: [0, 8, 0, 5]});

        let table = {style: 'tableDpat', layout: 'noBorders',  widths:[150], table: {
            body: [
              [
                self.textOnDialog.car_tab.area_car_label,
              ],
              [
                {text: self.decimalPipe.transform(item.metaData.area_car,'1.2-3') +'  km²', alignment: 'left',style: 'data'},
              ],
              [
                self.textOnDialog.car_tab.reference_date_car_label,
              ],
              [
                {text: item.metaData.dataRefFormatada, alignment: 'left',style: 'data'},
              ],
              [
                nascente[0],
              ],
              [
                nascente[1],
              ],
              [
                area_rl[0],
              ],
              [
                area_rl[1],
              ],
              [
                area_desmat_app[0]
              ],
              [
                area_desmat_app[1]
              ]
            ]
          }};
        columns.push(
            table,
            {
              image: await self.getBase64ImageFromUrl(self.vetCar[index].thumb),
              width: 150,
              margin: 5,
              alignment: 'center'
            },
            legend
        );
        dd.content.push({columns:columns})
        // @ts-ignore
        dd.content.push( {canvas: [{ type: 'line', x1: 0, y1: 5, x2: 595-2*40, y2: 5, lineWidth: 2 }]})
      }
    }
    // @ts-ignore
    dd.content.push({text:this.textOnDialog.historico_amostral_landsat.title_tab, style: 'subheader', pageBreak: this.carData.length > 0 ? "before" : false})

    if(this.dadosValidacao_Amostral.exist){
      let validacaoLandsat =  {columns: [
          {
            style: 'tableDpat',
            layout: 'noBorders',
            table: {
              body: [
                [
                  {text: this.textOnDialog.historico_amostral_landsat.amostral_title.toUpperCase(), alignment: 'left', colSpan:2},
                  {},
                ],
                [
                  this.textOnDialog.information_tab.polygon_label,
                  {text: this.dadosValidacao_Amostral.finalClass, alignment: 'left',style: 'data'},
                ]
              ]
            }
          },
          [
            {
              image: await this.getBase64ImageFromUrl(this.urlsLandSat.legend),
              width: 150,
            },
            // [left, top, right, bottom]
            {text: this.textOnDialog.historico_amostral_landsat.amostral_classes_legend_label, alignment: 'center',style: 'data',margin:[ 0, 15, 0, 0 ],},
          ]
        ]};
      dd.content.push(validacaoLandsat)
    }

    let separar = function (base, maximo) {
      var resultado = [[]];
      var grupo = 0;

      for (var indice = 0; indice < base.length; indice++) {
        if (resultado[grupo] === undefined) {
          resultado[grupo] = [];
        }

        resultado[grupo].push(base[indice]);

        if ((indice + 1) % maximo === 0) {
          grupo = grupo + 1;
        }
      }
      return resultado;
    }

    let columnsImages = separar(this.albumLandsat, 3);

    for (let [index, images] of columnsImages.entries()) {
      let imagesLanset = [];
      for (let [index, image] of images.entries()) {
        imagesLanset.push([
          {image: await self.getBase64ImageFromUrl(image.thumb), width: 170, alignment: 'center', margin:[ 2, 10, 2, 0]},
          {text:image.caption, alignment: 'center',margin:[ 0, 2, 0, 0]},
        ]);
      }
      dd.content.push({columns: imagesLanset});
    }

    let canvasToBase64Modis = async function(){
      let canvas = await html2canvas(document.querySelector("#reportChart"));
      return canvas.toDataURL('image/png');
    }

    // // @ts-ignore
    // dd.content.push({text:this.textOnDialog.historico_amostral_landsat.series_modis_title, style: 'subheader', margin:[ 0, 10, 0, 0]})
    // // @ts-ignore
    // dd.content.push({image: await canvasToBase64Modis(), width: 520, alignment: 'center', margin:[ 2, 10, 2, 0]})

    if(this.dataCampo.length > 0){
      // @ts-ignore
      dd.content.push({text:this.textOnDialog.campo_tab.title_tab, style: 'subheader', pageBreak: this.albumLandsat.length > 0 ? "before" : false})

      let usocobertura = [];
      let obs = [];

      if(this.infoVisita.usocobertura != ' '){
        usocobertura.push(this.textOnDialog.campo_tab.field_uso_do_solo_label, this.infoVisita.usocobertura);
      }else{
        usocobertura.push({},{});
      }

      if(this.infoVisita.obs != ' '){
        obs.push(this.textOnDialog.campo_tab.field_observation_label, this.infoVisita.obs);
      }else{
        obs.push({},{});
      }
      let table =  {
        style: 'tableDpat',
        layout: 'noBorders',
        table: {
          body: [
            [
              {text: this.textOnDialog.campo_tab.field_data_label.toUpperCase(), alignment: 'left', colSpan:2},
              {},
            ],
            [
              this.textOnDialog.campo_tab.field_number_label,
              {text: this.infoVisita.campo, alignment: 'left',style: 'data'},
            ],
            [
              this.textOnDialog.campo_tab.field_visit_date_label,
              {text: this.infoVisita.dataFormatada, alignment: 'left',style: 'data'},
            ],
            [
              this.textOnDialog.information_tab.latitude_label,
              {text: this.infoVisita.latitude, alignment: 'left',style: 'data'},
            ],
            [
              this.textOnDialog.information_tab.longitude_label,
              {text: this.infoVisita.longitude, alignment: 'left',style: 'data'},
            ],
            usocobertura,
            obs
          ]
        }
      };

      // @ts-ignore
      dd.content.push(table);

      if(this.galleryDrones.length > 0){
        for (const [index, item] of this.galleryDrones.entries()) {
          if(index < 4){
            // @ts-ignore
            dd.content.push({image: await self.getBase64ImageFromUrl(item.medium), width: 400, alignment: 'center', margin:[ 2, 10, 2, 10]});
            // [left, top, right, bottom]
            // @ts-ignore
            // dd.content.push({text:this.textOnDialog.campo_tab.title_drone_photo_tab + ' 0' + index+1, alignment: 'center'});
          }
        }
      }else{
        for (const [index, item] of this.galleryCamera.entries()) {
          if(index < 4){
            // @ts-ignore
            dd.content.push({image: await self.getBase64ImageFromUrl(item.medium), width: 400, alignment: 'center', margin:[ 2, 5, 2, 5]});
            // @ts-ignore
            // dd.content.push({text:this.textOnDialog.campo_tab.title_camera_tab + ' ' + index, alignment: 'center',});
          }
        }
      }

    }

    if(this.data.year > 2015 && this.data.year < 2019){
      let columns = [];
      // @ts-ignore
      dd.content.push({text:this.textOnDialog.analise_automatica.title_tab, style: 'subheader', pageBreak: this.albumLandsat.length > 0 ? "before" : false})
      let legend = [];

      if(this.dataSuscept.legend){
        legend.push(
            {
              image: await self.getBase64ImageFromUrl(self.dataSuscept.legend),
              width: 100,
              margin: 5,
              alignment: 'left'
            },
        );
      }

      legend.push({text:this.textOnDialog.analise_automatica.info_susceptibility_faixas, alignment: 'justify',style: 'data',  margin: [0, 10, 15, 0]});

      if(this.dataSuscept.prob_suscept != null){
        legend.push(
            {
              text:this.textOnDialog.analise_automatica.info_susceptibility_description_split[0] +
                  this.dataSuscept.type +
                  this.textOnDialog.analise_automatica.info_susceptibility_description_split[1] +
                  this.dataSuscept.sucept_desmatFormatada + '.',
              alignment: 'justify',
              margin: [0, 10, 15, 0],
              style: 'data'
            }
        );
      }

      columns.push(
          legend,
          {
            image: await self.getBase64ImageFromUrl(self.vetSuscept[0].thumb),
            width: 300,
            margin: 5,
            alignment: 'center'
          }
      );

      dd.content.push({columns:columns})
    };

    if(this.dataBfast.pct_bfast != null && this.dataBfast.pct_bfast > 0){
      let columns = [];
      // @ts-ignore
      dd.content.push({text:this.textOnDialog.analise_automatica.title_info_bfast, style: 'subheader'})
      let legend = [];

      if(this.dataBfast.legend){
        legend.push(
            {
              image: await self.getBase64ImageFromUrl(self.dataBfast.legend),
              width: 100,
              margin: 5,
              alignment: 'left'
            },
        );
      }

      legend.push({text:this.textOnDialog.analise_automatica.info_bfast_faixas, alignment: 'justify',style: 'data',  margin: [0, 10, 15, 0],});
      legend.push(
          {
            text:this.textOnDialog.analise_automatica.info_bfast_description +
                this.dataBfast.prob_Formatada,
            alignment: 'justify',
            margin: [0, 10, 15, 0],
            style: 'data'
          }
      );

      columns.push(
          legend,
          {
            image: await self.getBase64ImageFromUrl(self.vetBfast[0].thumb),
            width: 300,
            margin: 5,
            alignment: 'center'
          }
      );

      dd.content.push({columns:columns})
    };

    if(this.abcData.length > 0){
      // @ts-ignore
      dd.content.push({text:this.textOnDialog.fip_abc_tab.title_tab, style: 'subheader', pageBreak: "before"})

      for (const [index, item] of this.abcData.entries()) {
        let columns = [];

        let area_tecnologia = [];
        let tec_impl = [];

        if(item.metaData.area_tecnologia > 0){
          area_tecnologia.push(this.textOnDialog.fip_abc_tab.property_area_tec_label);
          area_tecnologia.push( {text:self.decimalPipe.transform(item.metaData.area_tecnologia,'1.2-3') +'  km²', alignment: 'left',style: 'data'});
        }else{
          area_tecnologia.push({},{});
        }

        if(item.metaData.tec_impl != null){
          tec_impl.push(this.textOnDialog.fip_abc_tab.property_applied_tec_label);
          tec_impl.push( {text: item.metaData.tec_impl, alignment: 'left',style: 'data'});
          tec_impl.push(this.textOnDialog.fip_abc_tab.property_area_deforested_label);
          tec_impl.push( {text: self.decimalPipe.transform(item.metaData.area_desmatada,'1.2-3') +'  km²', alignment: 'left',style: 'data'});
        }else{
          tec_impl.push({},{},{},{});
        }
        let legend = [];

        if(item.imgsProp.legendProp){
          legend.push(
              {
                image: await self.getBase64ImageFromUrl(item.imgsProp.legendProp),
                fit: [150, 20],
                alignment: 'left'
              }
          );
        }

        if(item.imgsProp.legendExp){
          legend.push(
              {
                image: await self.getBase64ImageFromUrl(item.imgsProp.legendExp),
                fit: [150, 20],
                alignment: 'left'
              }
          );
        }

        if(item.imgsProp.legendTec){
          legend.push(
              {
                image: await self.getBase64ImageFromUrl(item.imgsProp.legendTec),
                fit: [150, 20],
                alignment: 'left'
              }
          );
        }

        if(item.imgsProp.legendDesmatamento){
          legend.push(
              {
                image: await self.getBase64ImageFromUrl(item.imgsProp.legendDesmatamento),
                fit: [150, 20],
                alignment: 'left'
              }
          );
        }

        let table = {style: 'tableDpat', layout: 'noBorders',  widths:[150], table: {
            body: [
              [
                {text: this.textOnDialog.fip_abc_tab.title_info.toUpperCase(), alignment: 'left',style: 'data', margin: [0, 10, 0, 10]},
              ],
              [
                this.textOnDialog.fip_abc_tab.property_area_label
              ],
              [
                {text:  self.decimalPipe.transform(item.metaData.area_propriedade,'1.2-3') +'  km²', alignment: 'left',style: 'data'},
              ],
              [
                this.textOnDialog.fip_abc_tab.property_area_explored_label
              ],
              [
                {text:self.decimalPipe.transform(item.metaData.area_explorada,'1.2-3') +'  km²', alignment: 'left',style: 'data'},
              ],
              [
                area_tecnologia[0],
              ],
              [
                area_tecnologia[1],
              ],
              [
                tec_impl[0],
              ],
              [
                tec_impl[1]
              ],
              [
                tec_impl[2]
              ],
              [
                tec_impl[3]
              ]
            ]
          }};
        columns.push(
            table,
            {
              image: await self.getBase64ImageFromUrl(this.vetABC[index].thumb),
              width: 150,
              margin: 5,
              alignment: 'center'
            },
            legend
        );
        dd.content.push({columns:columns})
        // @ts-ignore
        dd.content.push( {canvas: [{ type: 'line', x1: 0, y1: 5, x2: 595-2*40, y2: 5, lineWidth: 2 }]})
      }
    }

    let dados = {
      token: new Date().getTime(),
      params:this.data
    }
    this.http.post('/service/report/store',JSON.stringify(dados, null, 2), this.httpOptions).subscribe(result => {
      if(Array.isArray(result) ){
        // @ts-ignore
        dd.content.push( { text:this.textOnDialog.information_tab.info_qrcode, alignment: 'center', style: 'textFooter', margin: [190, 80, 190, 10], pageBreak:false});
        // @ts-ignore
        dd.content.push({ qr: 'https://www.cerradodpat.org/#/plataforma/' + result[0].token, fit: '150', alignment: 'center'});
        // @ts-ignore
        dd.content.push( { text: 'https://www.cerradodpat.org/#/plataforma/' + result[0].token, alignment: 'center', style: 'textFooter', margin: [190, 10, 190, 0]});
        let filename = this.textOnDialog.title.toLowerCase() + ' - ' + result[0].token + '.pdf'
        pdfMake.createPdf(dd).download(filename);
      }
    },(err) => {
      console.error('Não foi possível cadastrar cadastrar a requisição do relatório')
      this.loading = false;
    });
    this.loading = false;
  }

  async printReportCounty(){
    let language = this.data.language;
    let self = this;

    let dd = {
      pageSize: 'A4',
      // by default we use portrait, you can change it to landscape if you wish
      pageOrientation: 'portrait',

      // [left, top, right, bottom]
      pageMargins: [ 40, 70, 40, 80 ],

      header: {
        margin:[ 24, 10, 24, 30 ],
        columns: [
          {
            image: logos.logoDPAT,
            width: 130
          },
          {
            // [left, top, right, bottom]
            margin:[ 65, 15, 10, 10 ],
            text: this.textOnDialog.title.toUpperCase(),
            style: 'titleReport',
          },

        ]
      },
      footer: function (currentPage, pageCount) {
        return {
          table: {
            widths: '*',
            body: [
              [
                { image: logos.signature, colSpan: 3, alignment: 'center', fit: [300, 43]},
                {},
                {},
              ],
              [
                { text: 'https://cerradodpat.org', alignment: 'left', style: 'textFooter', margin: [60, 0, 0, 0]},
                { text:moment().format('DD/MM/YYYY HH:mm:ss'), alignment: 'center', style: 'textFooter', margin: [0, 0, 0, 0]},
                { text: logos.page.title[language] + currentPage.toString() + logos.page.of[language] + '' + pageCount, alignment: 'right', style: 'textFooter', margin: [0, 0, 60, 0]},
              ],
            ]
          },
          layout: 'noBorders'
        };
      },
      content:[],
      styles: {
        titleReport: {
          fontSize: 16,
          bold: true
        },
        textFooter: {
          fontSize: 9
        },
        textImglegend: {
          fontSize: 9
        },
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10]
        },
        data: {
          bold: true,
        },
        subheader: {
          fontSize: 16,
          bold: true,
          margin: [0, 10, 0, 5]
        },
        codCar: {
          fontSize: 11,
          bold: true,
        },
        textObs: {
          fontSize: 11,
        },
        tableDpat: {
          margin: [0, 5, 0, 15],
          fontSize: 11,
        },
        tableHeader: {
          bold: true,
          fontSize: 13,
          color: 'black'
        },
        metadata:{
          background: '#0b4e26',
          color: '#fff'
        }
      }
    };

    let filename = 'reportCounty.pdf';

    pdfMake.createPdf(dd).download(filename);
  }

  ngOnInit() {

    let fieldPhotosUrl = '/service/report/field/' + this.getServiceParams();

    this.http.get(fieldPhotosUrl).subscribe(
      result => {

        this.infoDesmat = result['info'];

        if (this.infoDesmat.classefip == null) {
          this.infoDesmat.pathclassefip = '1';
        } else {
          this.infoDesmat.pathclassefip = '/assets/metric/classe' + this.infoDesmat.classefip + '.png'
        }

        this.carData = result['car'];
        this.carData.show = result['car'].show;

        this.carData.forEach(element => {

          element.metaData.dataRefFormatada = element.metaData.dataRef == '' ? this.textOnDialog.car_tab.undisclosed_message_car : this.data.datePipe.transform(new Date(element.metaData.dataRef), 'dd/MM/yyyy');
          // element.metaData.area_car = element.metaData.area_car / 100.0  //converte HA to Km2
          element.metaData.percentDesmat = '' + (((element.metaData.area_desmatada / element.metaData.area_car) * 100).toFixed(2) + '%').replace('.', ',');
          element.metaData.percentRL = '' + (((element.metaData.area_desmat_rl / element.metaData.area_reserva_legal_total) * 100).toFixed(2) + '%').replace('.', ',');
          element.metaData.percentAPP = '' + (((element.metaData.area_desmat_app / element.metaData.area_app_total) * 100).toFixed(2) + '%').replace('.', ',');

          this.textOnDialog.car_tab.display_rl_message = this.textOnDialog.car_tab.rl_car_label.split('?');
          this.textOnDialog.car_tab.display_app_message = this.textOnDialog.car_tab.app_car_label.split('?');
          this.textOnDialog.car_tab.display_car_description_message = this.textOnDialog.car_tab.deforestation_car_description.split('?');
          // this.textOnDialog.car_tab.display_rl_message = temp[0] + element.metaData.area_desmat_rl + temp[1] + element.metaData.percentRL + temp[2]

          let dcar = {
            src: element.imgsCar.src,
            caption: 'CAR: ' + element.metaData.cod_car,
            thumb: element.imgsCar.thumb
          };
          this.vetCar.push(dcar);

        });


        this.abcData = result['ABC'];

        this.abcData.forEach(element => {

          let dcar = {
            src: element.imgsProp.src,
            caption: 'ID: ' + element.metaData.chaveID,
            thumb: element.imgsProp.thumb
          };
          this.vetABC.push(dcar);

        });

        let sent = {
          src: result['images'].urlSentinel.src,
          caption: 'LandSat ' + this.data.year,
          thumb: result['images'].urlSentinel.thumb
        };
        this.urlSentinel.push(sent);

        this.dataCampo = result['ponto_campo'];

        this.urlsLandSat = result['images'].urlsLandSat;

        for (let i = 0; i < this.urlsLandSat.urlsLandsatMontadas.length; i++) {
          let album = {
            src: this.urlsLandSat.urlsLandsatMontadas[i].url,
            caption: this.textOnDialog.historico_amostral_landsat.caption + this.urlsLandSat.urlsLandsatMontadas[i].year,
            thumb: this.urlsLandSat.urlsLandsatMontadas[i].thumb
          };

          this.albumLandsat.push(album);
        }

        this.dadosValidacao_Amostral = result['images'].urlsLandSat.dadosAmostrais;

        this.dataBfast = result['images'].urlBfast;
        this.dataBfast.prob_Formatada = this.dataBfast.pct_bfast == null ? this.textOnDialog.analise_automatica.not_computed : ('' + this.dataBfast.pct_bfast.toFixed(2) + '%').replace('.', ',');

        let dfast = {
          src: this.dataBfast.urlBfast.src,
          caption: this.dataBfast.prob_Formatada + this.textOnDialog.analise_automatica.caption_bfast,
          thumb: this.dataBfast.urlBfast.thumb
        };
        this.vetBfast.push(dfast);

        this.dataSuscept = result['images'].suscept;

        this.textOnDialog.analise_automatica.info_susceptibility_description_split = this.textOnDialog.analise_automatica.info_susceptibility_description.split('?');
        this.dataSuscept.sucept_desmatFormatada = this.dataSuscept.prob_suscept == null ? this.textOnDialog.analise_automatica.not_computed : ('' + (this.dataSuscept.prob_suscept * 100).toFixed(2) + '%').replace('.', ',');
        let dsuscept = {
          src: this.dataSuscept.urlSuscept.src,
          caption: this.textOnDialog.analise_automatica.caption_suscept + this.dataSuscept.sucept_desmatFormatada,
          thumb: this.dataSuscept.urlSuscept.thumb
        };
        this.vetSuscept.push(dsuscept);
      },
      err => {
        console.log('Error: ', err);
      },
      () => {
        // <---- chamada ao finalizar o subscribe.
        this.galleryOptions = [
          {
            width: '100%',
            height: '500px',
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
            width: '100%',
            height: '700px',
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
          let element = this.dataCampo[index];

          this.infoVisita = element;

          this.infoVisita.dataFormatada = this.infoVisita.data_visita == '' ? this.textOnDialog.campo_tab.caption_undisclosed : this.infoVisita.data_visita;


          for (let foto = 0; foto < element.fotos_camera.length; foto++) {
            this.galleryCamera.push({
              small: '/service/report/field/fotos_camera/' + element.campo_id + '/' + element.fotos_camera[foto],
              medium: '/service/report/field/fotos_camera/' + element.campo_id + '/' + element.fotos_camera[foto],
              big: '/service/report/field/fotos_camera/' + element.campo_id + '/' + element.fotos_camera[foto],
            });
          }


          for (let foto = 0; foto < element.fotos_drone.length; foto++) {
            this.galleryDrones.push({
              small: '/service/report/field/fotos_drone/' + element.campo_id + '/' + element.fotos_drone[foto],
              medium: '/service/report/field/fotos_drone/' + element.campo_id + '/' + element.fotos_drone[foto],
              big: '/service/report/field/fotos_drone/' + element.campo_id + '/' + element.fotos_drone[foto]
            });
          }

          for (let video = 0; video < element.videos_drone.length; video++) {
            this.galleryVideos.push({
              small: '/service/report/field/videos_drone/' + element.campo_id + '/' + element.videos_drone[video],
              medium: '/service/report/field/videos_drone/' + element.campo_id + '/' + element.videos_drone[video],
              big: '/service/report/field/videos_drone/' + element.campo_id + '/' + element.videos_drone[video]
            });
          }
        }
      }
    );


     //  @todo REMOVE
    // let ndvi_time_series = '/service/deforestation/modis?table=' + this.data.origin_table + '&gid=' + this.data.gid;
    // this.http.get(ndvi_time_series).subscribe(
    //   result => {
    //     this.tmpModis = result;
    //   },
    //   err => {
    //     console.log('Error: ', err);
    //   },
    //   () => {

    //     this.dataTimeseriesModis = {
    //       labels: this.tmpModis.map(element => element.date),
    //       datasets: [
    //         // {
    //         //   label: 'NDVI',
    //         //   data: this.tmpModis.map(element => element.ndvi_original.toFixed(4)),
    //         //   fill: false,
    //         //   borderColor: '#ff0003',
    //         //   backgroundColor: '#ff0003',
    //         //   pointRadius: 1,
    //         //   pointStyle: 'rect',
    //         //   pointHoverRadius: 3
    //         // },
    //         // {
    //         //   label: 'NDVI-Wiener',
    //         //   data: this.tmpModis.map(element => element.ndvi_wiener.toFixed(4)),
    //         //   fill: false,
    //         //   borderColor: '#208f0a',
    //         //   backgroundColor: '#208f0a',
    //         //   hidden: true,
    //         //   pointRadius: 1,
    //         //   pointStyle: 'rect',
    //         //   pointHoverRadius: 3
    //         // },
    //         {
    //           label: 'NDVI',
    //           data: this.tmpModis.map(element => element.ndvi_golay.toFixed(4)),
    //           fill: false,
    //           borderColor: '#0007db',
    //           backgroundColor: '#0007db',
    //           hidden: false,
    //           pointRadius: 1,
    //           pointHoverRadius: 3,
    //           pointStyle: 'rect'
    //         }
    //       ],
    //       type: 'line'

    //     };

    //     // graphic.options.legend.onHover = function (event) {
    //     //   event.target.style.cursor = 'pointer';
    //     //   graphic.options.legend.labels.fontColor = "#0335fc";
    //     // }

    //     // graphic.options.legend.onLeave = function (event) {

    //     //   event.target.style.cursor = 'default';
    //     //   graphic.options.legend.labels.fontColor = "#fa1d00";
    //     // }

    //     this.optionsTimeSeries = {
    //       tooltips: {
    //         mode: 'index',
    //         intersect: true,
    //       },
    //       maintainAspectRatio: false,
    //       resposive: true,
    //       radius: 1,
    //       scales: {
    //         yAxes: [{
    //           ticks: {
    //             autoSkip: true,
    //             stepSize: 0.2
    //           }
    //         }],
    //         xAxes: [{
    //           type: 'time',
    //           ticks: {
    //             autoSkip: true
    //           }
    //         }]
    //       },
    //       title: {
    //         display: false,
    //         fontSize: 16
    //       },
    //       legend: {
    //         labels: {
    //           usePointStyle: true,
    //           fontSize: 16
    //         },
    //         onHover(event) {
    //           event.target.style.cursor = 'pointer';
    //         },
    //         onLeave(event) {
    //           event.target.style.cursor = 'default';
    //         },
    //         position: 'bottom'
    //       }
    //     };



    //   }
    // );
  }

  ngOnDestroy() {
    this.cdRef.detach();
  }

  ngAfterViewInit(): void {
    //Called after ngAfterContentInit when the component's view has been initialized. Applies to components only.
    //Add 'implements AfterViewInit' to the class.
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

  openLightboxABC(index: number): void {
    this._lightbox.open(this.vetABC, index);
  }
}