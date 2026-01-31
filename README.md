# TurbOmis/TurboPutative

## Getting Started

+ Start the application using the ecosystem file
```bash
pm2 start ecosystem.config.js
```

If it's already running:
```bash
pm2 restart ecosystem.config.js
```
or reload safely:
```bash
pm2 reload ecosystem.config.js
``` 

+ Verify the flags are applied
```bash
pm2 show turbomics
```

+ Where to see the traces
```bash
pm2 logs turbomics
```
or directly:
```bash
tail -f ./logs/error.log
```

---

# License

## Open Source License (MIT)

This software is released under the **MIT License**, an OSI-approved open-source license.

Under the MIT License, you are free to:

* Use the software for any purpose
* Modify the source code
* Distribute the software or derivative works

Provided that the original copyright notice and license text are included in all copies or substantial portions of the software.

The full license text is available in the [`LICENSE.md`](LICENSE.md) file.

## Commercial Use & Dual Licensing

While the software is fully open source under the MIT License, the author also offers **separate commercial licensing options**.

These commercial offerings are **optional** and do not restrict the rights granted by the MIT License.

If you are interested in commercial collaboration or services, please contact:

**Contact:** Alessia Ferrarini <alessia.ferrarini@cnic.es>
