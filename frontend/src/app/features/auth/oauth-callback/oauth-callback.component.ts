import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-oauth-callback',
  templateUrl: './oauth-callback.component.html',
  styleUrls: ['./oauth-callback.component.scss']
})
export class OAuthCallbackComponent implements OnInit {
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Get token and provider from query params
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const provider = params['provider'];
      const error = params['error'];

      if (error) {
        this.handleError(error);
        return;
      }

      if (token) {
        this.handleSuccess(token, provider);
      } else {
        this.handleError('No token received');
      }
    });
  }

  private handleSuccess(token: string, provider: string): void {
    console.log(`OAuth success: ${provider}`);
    
    // Store token
    localStorage.setItem('auth_token', token);
    
    // Fetch user data
    this.http.get<{ success: boolean; data: { user: any } }>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (response) => {
        console.log('User data fetched:', response.data.user);
        
        // Store user data
        localStorage.setItem('current_user', JSON.stringify(response.data.user));
        
        this.snackBar.open(`Welcome! Signed in with ${provider}`, 'Close', { duration: 3000 });
        this.loading = false;
        
        // Redirect to dashboard
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1000);
      },
      error: (error: any) => {
        console.error('Error fetching user:', error);
        this.handleError('Failed to fetch user data');
      }
    });
  }

  private handleError(error: string): void {
    console.error('OAuth error:', error);
    this.error = error;
    this.loading = false;
    
    this.snackBar.open(`Authentication failed: ${error}`, 'Close', { duration: 5000 });
    
    // Redirect to login after 3 seconds
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 3000);
  }
}
