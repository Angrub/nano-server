import { NanoHttpServer } from '@core';
import { Colors } from '@util';

const MODULE_NAME = '[NanoHttpServer]';

function display(msg?: string) {
    return msg
        ? `${Colors.cyan}${MODULE_NAME}: ${Colors.reset}${msg}`
        : `${Colors.cyan}${MODULE_NAME}${Colors.reset}`
}

describe(display(), () => {
    test(display('Must create instance with run() method'), () => {
        const server = new NanoHttpServer();
      
        
        expect(server).toBeInstanceOf(NanoHttpServer);
        expect(server).toHaveProperty('listen');
    })
});