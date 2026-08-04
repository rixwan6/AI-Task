import { provideHttpClient } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { StandupPageComponent } from './pages/standup-page/standup-page.component';
import { StandupFormComponent } from './components/standup-form/standup-form.component';
import { StandupHistoryComponent } from './components/standup-history/standup-history.component';
import { StandupCardComponent } from './components/standup-card/standup-card.component';
import { GithubPanelComponent } from './components/github-panel/github-panel.component';

@NgModule({
  declarations: [
    AppComponent,
    StandupPageComponent,
    StandupFormComponent,
    StandupHistoryComponent,
    StandupCardComponent,
    GithubPanelComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule
  ],
  // provideHttpClient() is the current API; HttpClientModule is deprecated in
  // Angular 19 and still works, but there is no reason to reach for it here.
  providers: [
    provideHttpClient()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
