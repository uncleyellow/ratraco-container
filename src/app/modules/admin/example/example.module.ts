import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { MatSortModule } from '@angular/material/sort';
import { Route, RouterModule } from '@angular/router';
import { ExampleComponent } from 'app/modules/admin/example/example.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AddRecordDialogComponent } from '../add-record-dialog/add-record-dialog.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

const exampleRoutes: Route[] = [
    {
        path     : '',
        component: ExampleComponent
    }
];

@NgModule({
    declarations: [
        ExampleComponent,
        AddRecordDialogComponent
    ],
    imports     : [
        RouterModule.forChild(exampleRoutes),
        HttpClientModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatInputModule,
        CommonModule,
        MatIconModule,
        MatSelectModule,
        MatFormFieldModule, 
        ReactiveFormsModule,
        FormsModule
    ]
})
export class ExampleModule
{
}
