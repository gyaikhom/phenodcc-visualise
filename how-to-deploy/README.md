# Production deployment of **Phenoview**

The following are guidelines for production deployment of **Phenoview**. While
the debug enabled Javascripts are appropriate for development, they *must not*
be used for production deployment. Furthermore, we optimise the deployment
package and server configuration to reduce data transfer and processing latency.


## Packaging the web application

Here are the steps to generate a deployment package:

0. Compile the dependencies. They should be made available in the local
   Maven repository (inside `~/.m2`). Don't forget to set the target database
   hostname and credentials in `pom.xml` before compiling (`mvn clean install`)
   the projects. The dependencies are:

   * `phenodcc-entities-context`
   * `phenodcc-entities-crawler`
   * `phenodcc-entities-impress`
   * `phenodcc-entities-overviews`
   * `phenodcc-entities-qc`
   * `phenodcc-entities-raw`

1. Either clone the Git project, or download the source code.
   Let us assume that the source code is now in `/home/user/phenodcc-visualise/`

2. Alter the Maven profile inside the `pom.xml` file to the target database host
   and credentials.

3. Create a temporary deployment directory where we wish to
   carry out the packaging.

        $ whoami
        user
        $ cd
        $ pwd
        /home/user
        $ mkdir deployment_dir
        cd deployment_dir
   
4. Run the bash script `how-to-deploy/package.sh` in the project source root.
   This will create a `war` file named `phenodcc-visualise-<VERSION>.war`. Note
   that `<VERSION>` is the version specified in `pom.xml`.

        $ /home/user/phenodcc-visualise/how-to-deploy/package.sh \
          /home/user/phenodcc-visualise/ live

   Please note that the `live` option above is a Maven profile inside
   `pom.xml` file. For further details on how the package is generated,
    see `how-to-deploy/package.sh` script. 


## Optimising the server

We are using Apache Tomcat to deploy the application. It is advisable to
improve the application load time by using gzip compression while transferring
data between server and client browser. The following options must be set in
the connector section of `conf/server.xml`:

    compression="on"
    compressionMinSize="2048"
    noCompressionUserAgents="gozilla, traviata"
    compressableMimeType="text/html,text/xml,text/css,application/javascript,application/json"


For instance, the following is a sample configuration.

    <Connector port="8080" protocol="HTTP/1.1"
               connectionTimeout="20000"
               redirectPort="8443"
               compression="on"
               compressionMinSize="2048"
               noCompressionUserAgents="gozilla, traviata"
               compressableMimeType="text/html,text/xml,text/css,application/javascript,application/json"
    />


