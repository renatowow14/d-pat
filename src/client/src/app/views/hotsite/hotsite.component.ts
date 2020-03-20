import { Component, OnInit, ElementRef, OnDestroy } from '@angular/core';
import {HttpClient} from "@angular/common/http";

declare  var $: any;

@Component({
  selector: 'app-hotsite',
  templateUrl: './hotsite.component.html',
  styleUrls: ['./hotsite.component.css']
})
export class HotsiteComponent {
 
  pt_br:boolean;
  texts:any = {};
  interValMasks:any = {};

  videoplay: any = {};

  constructor(private http: HttpClient,private elementRef: ElementRef) { 

  }

    onLangClick(lang){
        if(lang == 'pt-br'){
            this.pt_br =  true;
        }else{
            this.pt_br =  false;
        }

        this.http.get('/service/hotsite/lang?lang=' + lang).subscribe(result => {
            this.texts = result;
        });
    }

    openMenu() {

        let firstMask = true;

        this.interValMasks = setInterval(function(){

            if(firstMask){
                $('#container').YTPPause();
                $('#container').YTPAddMask('../assets/img/background_overlay_1.svg');
            }else{
                $('#container').YTPPause();
                $('#container').YTPAddMask('../assets/img/background_overlay_2.svg');
            }
            firstMask = !firstMask;

        }, 5000);

        $('#container').YTPAddMask('../assets/img/background_overlay_2.svg');
        $('#container').YTPMute();
        $('#container').YTPPause();

        $(".content-overlay, .bg-overlay").addClass("opened"),
            $("#logo").addClass("pushed"),
            $(".c-hamburger").addClass("is-active"),
            $(".info").addClass("is-active"),
            $(".menu").css('display', 'none'),
            $(".info-2").css('display', 'block'),
            $("#dpat-nav").addClass("active"),
            $.fn.fullpage.moveTo(1)
    }

    closeMenu() {
        clearInterval(this.interValMasks);

        $('#container').YTPRemoveMask();
        $('#container').YTPPlay();
        $(".content-overlay, .bg-overlay").removeClass("opened"),
        $("#logo").removeClass("pushed"),
        $(".menu").css('display', 'block'),
        $(".c-hamburger").removeClass("is-active"),
        $(".info-2").css('display', 'none'),
        $(".info").removeClass("is-active"),
        $(".section, #dpat-nav").removeClass("active")
    }

    handleMenu(event){
      clearInterval(this.interValMasks);
      if(event.target.classList.contains("is-active")){
          this.closeMenu();
      }else{
          this.openMenu();
      }

    }

  ngOnInit() {
    this.pt_br = true;

    this.http.get('/service/hotsite/lang?lang=pt-br').subscribe(result => {
        this.texts = result;
    });

    this.videoplay = $("#container").YTPlayer(
      {
        useOnMobile:true,
        mobileFallbackImage:'../../../assets/img/background_1.svg',
        videoURL:'https://youtu.be/lXV5cSMoAuw',
        quality: 'medium',
        coverImage: '../../../assets/img/background_1.svg',
        containment:'#hotsite',
        autoPlay:true,
        onReady:true,
        optimizeDisplay:true,
        showControls:false,
        startAt:0,
        stopMovieOnBlur: false,
        opacity:1,
        mute:true
      }
    );

    $("#container").YTPlayer({
      mask:{
          25: '../../../assets/img/background_5.png'
      }
    });


    $("#fullpage").fullpage({
      navigation: !0,
      scrollingSpeed: 1e3
      // navigationTooltips: ["O QUE É?", "DIFERENCIAL", "COMO USAR?", "FIP MONITORAMENTO", "EQUIPE"]
    });

    $(".section").removeClass("active");


  }


}
