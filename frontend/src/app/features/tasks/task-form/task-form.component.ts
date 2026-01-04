import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TaskService } from '../../../core/services/task.service';
import { Task } from '../../../core/models/task.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.scss']
})
export class TaskFormComponent implements OnInit {
  taskForm: FormGroup;
  loading = false;
  isEditMode = false;

  priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService,
    private dialogRef: MatDialogRef<TaskFormComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { task?: Task }
  ) {
    this.isEditMode = !!data?.task;
    
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      dueDate: [''], // Optional - will default to today
      dueTime: [''],
      endTime: [''],
      priority: ['medium', Validators.required],
      isCritical: [false]
    });
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.task) {
      const task = this.data.task;
      this.taskForm.patchValue({
        title: task.title,
        description: task.description || '',
        dueDate: task.due_date,
        dueTime: task.due_time || '',
        endTime: (task as any).end_time || '',
        priority: task.priority,
        isCritical: task.is_critical
      });
    }
  }

  onSubmit(): void {
    if (this.taskForm.valid) {
      this.loading = true;
      const formValue = { ...this.taskForm.value };
      
      // Ensure date is always present and in correct format
      if (!formValue.dueDate) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        formValue.dueDate = `${year}-${month}-${day}`; // Format: YYYY-MM-DD
      } else {
        // Ensure date is in YYYY-MM-DD format (remove time if present)
        formValue.dueDate = formValue.dueDate.split('T')[0];
      }

      // Ensure boolean values are proper booleans
      formValue.isCritical = !!formValue.isCritical;

      // Log the exact values being sent
      console.log('=== TASK FORM SUBMISSION ===');
      console.log('Title:', formValue.title);
      console.log('Due Date:', formValue.dueDate);
      console.log('Due Time (start):', formValue.dueTime);
      console.log('End Time:', formValue.endTime);
      console.log('Priority:', formValue.priority);
      console.log('Is Critical:', formValue.isCritical);
      console.log('============================');

      console.log('Submitting task form:', {
        isEditMode: this.isEditMode,
        taskId: this.data.task?.id,
        formValue: formValue
      });

      if (this.isEditMode && this.data.task) {
        this.taskService.updateTask(this.data.task.id, formValue).subscribe({
          next: () => {
            this.snackBar.open('Task updated successfully!', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          },
          error: (error) => {
            console.error('Update task error:', error);
            
            // Show detailed validation errors if available
            if (error?.error?.error?.details) {
              const details = error.error.error.details;
              const errorMessages = details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
              this.snackBar.open(`Validation Error: ${errorMessages}`, 'Close', { duration: 8000 });
            } else {
              const errorMessage = error?.error?.error?.message || error?.message || 'Failed to update task';
              this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
            }
            
            this.loading = false;
          },
          complete: () => {
            this.loading = false;
          }
        });
      } else {
        this.taskService.createTask(formValue).subscribe({
          next: () => {
            this.snackBar.open('Task created successfully!', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          },
          error: (error) => {
            console.error('Create task error:', error);
            
            // Show detailed validation errors if available
            if (error?.error?.error?.details) {
              const details = error.error.error.details;
              const errorMessages = details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
              this.snackBar.open(`Validation Error: ${errorMessages}`, 'Close', { duration: 8000 });
            } else {
              const errorMessage = error?.error?.error?.message || error?.message || 'Failed to create task';
              this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
            }
            
            this.loading = false;
          },
          complete: () => {
            this.loading = false;
          }
        });
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
