FROM eclipse-temurin:8-jre
COPY application.yml application.yml
COPY litemall.jar litemall.jar
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -Djava.security.egd=file:/dev/./urandom -jar litemall.jar"]