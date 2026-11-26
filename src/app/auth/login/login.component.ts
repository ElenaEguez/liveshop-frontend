import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage = '';
  saving = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      remember: [true],
    });
  }

  ngOnInit(): void {
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.saving) {
      return;
    }
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const { email, password, remember } = this.loginForm.value;
    this.authService.login({ email, password }, remember).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.saving = false;
        if (error.status === 400) {
          this.errorMessage = 'Datos inválidos. Verifique su correo electrónico y contraseña.';
        } else if (error.status === 401) {
          this.errorMessage = 'Correo electrónico o contraseña incorrectos.';
        } else {
          this.errorMessage = 'Error del servidor. Por favor, intente nuevamente más tarde.';
        }
      },
    });
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
