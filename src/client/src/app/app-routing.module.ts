import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MapComponent } from './views/map.component';
import { HotsiteComponent } from './views/hotsite/hotsite.component';

const routes: Routes = [
  /* ROTA RAIZ */
  { path: '', redirectTo: '/hotsite', pathMatch: 'full' },
  { path: 'hotsite', component: HotsiteComponent },
  { path: 'plataforma', component: MapComponent },
]

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
