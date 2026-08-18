class RegisterRequest {
  constructor({ name, email, phone, password, registrationDate }) {
    this.name = name;
    this.email = email;
    this.password = password;
    this.registrationDate = registrationDate;
  }
}

module.exports = RegisterRequest;
