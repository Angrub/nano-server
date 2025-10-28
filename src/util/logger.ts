import { Colors } from "./colors";

export class Logger {
    private serviceName: string;
    
    constructor(serviceName: string) {
        this.serviceName = serviceName;
    }

    public success(message: string) {
        console.log(`${Colors.green}${Colors.bright}[${this.serviceName} ✓]:${Colors.reset} ${message}`);
    }

    public error(message: string | unknown) {
        console.error(`${Colors.red}${Colors.bright}[${this.serviceName} ✗]:${Colors.reset} ${message}`);
        console.error(message);
    }

    public info(message: string) {
        console.log(`${Colors.blue}${Colors.bright}[${this.serviceName} ℹ]:${Colors.reset} ${message}`);
    }

    public warning(message: string) {
        console.warn(`${Colors.yellow}${Colors.bright}[${this.serviceName} ⚠]:${Colors.reset} ${message}`);
    }

    public server(message: string) {
        console.log(`${Colors.magenta}${Colors.bright}[${this.serviceName}]:${Colors.reset} ${message}`);
    }

    public custom(color: string, message: string, icon: string = '') {
        console.log(`${color}${Colors.bright}[${this.serviceName} ${icon}]:${Colors.reset} ${message}`);
    }
}