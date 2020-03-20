import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MapComponent } from './views/map.component';
import { HotsiteComponent } from './views/hotsite/hotsite.component';

const routes: Routes = [
/* ROTA RAIZ */ 
  { path: 'hotsite', component: HotsiteComponent },
  { path: 'plataforma', component: MapComponent },
  { path: '', redirectTo: '/hotsite', pathMatch: 'full' },
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
